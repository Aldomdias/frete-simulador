import { Router, type IRouter } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { origensTable, rotasTable, cotacoesTable, taxasEspeciaisTable, transportadorasTable } from "@workspace/db";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Importar Transportadoras (com Origens opcional) ───────────────────────────
// Colunas: A=Transportadora, B=Ativo(Sim/Não), C=Canal(B2C/ATACADO/LOTAÇÃO), D=Cidade, E=UF
// Se colunas C/D/E estiverem preenchidas, já cria as origens vinculadas.
// A transportadora é criada apenas uma vez (buscada por nome se já existir).
// Linha 1 = cabeçalho (ignorada).

function parseBool(v: string, defaultVal = true): boolean {
  if (!v) return defaultVal;
  const l = v.toLowerCase();
  return l === "sim" || l === "s" || l === "true" || l === "1" || l === "yes";
}

function normalizeCanal(v: string): string {
  const l = v.trim().toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (l === "B2C" || l === "VAREJO") return "B2C";
  if (l === "ATACADO" || l === "B2B") return "ATACADO";
  if (l === "LOTACAO" || l === "LOTAÇÃO" || l === "FTL") return "LOTAÇÃO";
  return v.trim() || "B2C";
}

router.post("/transportadoras/importar", upload.single("arquivo"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "Arquivo não enviado" }); return; }
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];

    const transportadoraCache: Record<string, number> = {};
    let transportadorasInseridas = 0;
    let origensInseridas = 0;
    let linhasIgnoradas = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nome = String(row[0] ?? "").trim();
      if (!nome) { linhasIgnoradas++; continue; }

      const ativoRaw = String(row[1] ?? "").trim();
      const ativo = parseBool(ativoRaw);

      const canalRaw = String(row[2] ?? "").trim();
      const cidadeRaw = String(row[3] ?? "").trim();
      const ufRaw = String(row[4] ?? "").trim().toUpperCase().slice(0, 2);

      // Find or create transportadora
      let transportadoraId = transportadoraCache[nome.toLowerCase()];
      if (!transportadoraId) {
        const existing = await db.select({ id: transportadorasTable.id })
          .from(transportadorasTable)
          .where(eq(transportadorasTable.nome, nome))
          .limit(1);
        if (existing.length > 0) {
          transportadoraId = existing[0].id;
        } else {
          const [created] = await db.insert(transportadorasTable).values({ nome, ativo }).returning({ id: transportadorasTable.id });
          transportadoraId = created.id;
          transportadorasInseridas++;
        }
        transportadoraCache[nome.toLowerCase()] = transportadoraId;
      }

      // If canal + cidade provided, create origem
      if (cidadeRaw) {
        const canal = normalizeCanal(canalRaw || "B2C");
        await db.insert(origensTable).values({
          transportadoraId,
          canal,
          cidade: cidadeRaw,
          uf: ufRaw,
        });
        origensInseridas++;
      }
    }

    res.json({
      transportadorasInseridas,
      origensInseridas,
      linhasIgnoradas,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao processar arquivo", detalhe: String(err?.message ?? err) });
  }
});

function parseXlsx(buffer: Buffer) {
  return XLSX.read(buffer, { type: "buffer", cellDates: false });
}

function cell(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const c = ws[addr];
  if (!c) return "";
  return String(c.v ?? "").trim();
}

function cellNum(ws: XLSX.WorkSheet, row: number, col: number): number {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const c = ws[addr];
  if (!c) return 0;
  const n = parseFloat(String(c.v ?? "0").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// ── Importar Generalidades ─────────────────────────────────────────────────────

router.post("/origens/:origemId/importar-generalidades", upload.single("arquivo"), async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  if (!req.file) { res.status(400).json({ error: "Arquivo não enviado" }); return; }
  try {
    const wb = parseXlsx(req.file.buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];

    const faixaDePeso = cell(ws, 3, 2).toLowerCase() === "sim";
    const icms = cell(ws, 5, 2).toLowerCase() === "sim";
    const adValorem = cellNum(ws, 6, 2);
    const adValoremMinimo = cellNum(ws, 7, 2);
    const pedagio = cellNum(ws, 8, 2);
    const grisPercentual = cellNum(ws, 11, 2);
    const grisMinimo = cellNum(ws, 12, 2);
    const tas = cellNum(ws, 5, 5);
    const ctrcEmitido = cellNum(ws, 7, 5);
    const cubagem = cellNum(ws, 14, 2) || 300;
    const observacoes = cell(ws, 17, 1) || cell(ws, 18, 1) || null;

    await db.update(origensTable).set({
      faixaDePeso, icms, adValorem, adValoremMinimo, pedagio,
      grisPercentual, grisMinimo, tas, ctrcEmitido, cubagem,
      observacoes: observacoes || undefined,
    }).where(eq(origensTable.id, origemId));

    let taxasImportadas = 0;
    if (wb.SheetNames.length > 1) {
      const wsTaxas = wb.Sheets[wb.SheetNames[1]];
      const rows = XLSX.utils.sheet_to_json(wsTaxas, { header: 1, defval: "" }) as any[][];
      for (let i = 1; i < rows.length; i++) {
        const ibge = String(rows[i][0] ?? "").trim();
        if (!ibge) continue;
        const trt = parseFloat(String(rows[i][1] ?? "0").replace(",", ".")) || 0;
        const tda = parseFloat(String(rows[i][2] ?? "0").replace(",", ".")) || 0;
        const suframa = parseFloat(String(rows[i][3] ?? "0").replace(",", ".")) || 0;
        const outras = parseFloat(String(rows[i][4] ?? "0").replace(",", ".")) || 0;
        if (!trt && !tda && !suframa && !outras) continue;
        const existing = await db.select({ id: taxasEspeciaisTable.id }).from(taxasEspeciaisTable)
          .where(and(eq(taxasEspeciaisTable.origemId, origemId), eq(taxasEspeciaisTable.ibgeDestino, ibge)));
        if (existing.length > 0) {
          await db.update(taxasEspeciaisTable).set({ trt, tda, suframa, outras }).where(eq(taxasEspeciaisTable.id, existing[0].id));
        } else {
          await db.insert(taxasEspeciaisTable).values({ origemId, ibgeDestino: ibge, trt, tda, suframa, outras });
        }
        taxasImportadas++;
      }
    }

    res.json({ mensagem: `Generalidades atualizadas. ${taxasImportadas} taxa(s) especial(is) importada(s).`, taxasImportadas });
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao processar arquivo", detalhe: e.message });
  }
});

// ── Importar Rotas ─────────────────────────────────────────────────────────────

router.post("/origens/:origemId/importar-rotas", upload.single("arquivo"), async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  if (!req.file) { res.status(400).json({ error: "Arquivo não enviado" }); return; }
  try {
    const wb = parseXlsx(req.file.buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = rows[i].join("|").toLowerCase();
      if (rowStr.includes("ibge") || rowStr.includes("prazo") || rowStr.includes("cotação") || rowStr.includes("cotacao")) {
        headerRow = i;
        break;
      }
    }
    const dataStart = headerRow >= 0 ? headerRow + 1 : 4;

    let importados = 0;
    const erros: string[] = [];

    // Detect column positions dynamically from header; default=4 (original behavior)
    let nomeRotaColR = 4;
    let ibgeOrigemCol = 5;
    if (headerRow >= 0) {
      const hRow = rows[headerRow] as any[];
      for (let c = 0; c < hRow.length; c++) {
        const v = String(hRow[c] ?? "").toLowerCase().trim();
        if (v === "ibge origem" || v === "ibge_origem") {
          ibgeOrigemCol = c;
          nomeRotaColR = c - 1;
          break;
        }
        if (v === "cotação" || v === "cotacao" || v === "rota" || v === "nome rota") {
          nomeRotaColR = c;
          ibgeOrigemCol = c + 1;
          break;
        }
      }
    }

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      const nomeRota = String(row[nomeRotaColR] ?? "").trim();
      const ibgeOrigem = String(row[ibgeOrigemCol] ?? "").trim();
      const ibgeDestino = String(row[ibgeOrigemCol + 1] ?? "").trim();
      const cepInicio = String(row[ibgeOrigemCol + 2] ?? "").trim();
      const cepFim = String(row[ibgeOrigemCol + 3] ?? "").trim();
      const metodoEnvio = String(row[ibgeOrigemCol + 4] ?? "RODOVIARIO").trim() || "RODOVIARIO";
      const prazo = parseInt(String(row[ibgeOrigemCol + 5] ?? "1").trim()) || 1;

      if (!nomeRota || !ibgeOrigem || !ibgeDestino) continue;

      try {
        const existing = await db.select({ id: rotasTable.id }).from(rotasTable)
          .where(and(eq(rotasTable.origemId, origemId), eq(rotasTable.nomeRota, nomeRota), eq(rotasTable.ibgeDestino, ibgeDestino)));
        if (existing.length > 0) {
          await db.update(rotasTable).set({
            ibgeOrigem, ibgeDestino, cepInicioFaixa: cepInicio || null, cepFimFaixa: cepFim || null,
            metodoEnvio, prazoEntregaDias: prazo,
          }).where(eq(rotasTable.id, existing[0].id));
        } else {
          await db.insert(rotasTable).values({
            origemId, nomeRota, ibgeOrigem, ibgeDestino,
            cepInicioFaixa: cepInicio || null, cepFimFaixa: cepFim || null,
            canal: "AMBOS", metodoEnvio, prazoEntregaDias: prazo, valorMinimoFrete: 0,
          });
        }
        importados++;
      } catch (e: any) {
        erros.push(`Linha ${i + 1}: ${e.message}`);
      }
    }

    res.json({ importados, erros: erros.length, detalhes: erros.slice(0, 20), mensagem: `${importados} rota(s) importada(s) com sucesso.` });
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao processar arquivo", detalhe: e.message });
  }
});

// ── Importar Fretes/Cotações ───────────────────────────────────────────────────

router.post("/origens/:origemId/importar-fretes", upload.single("arquivo"), async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  if (!req.file) { res.status(400).json({ error: "Arquivo não enviado" }); return; }
  try {
    const wb = parseXlsx(req.file.buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = rows[i].join("|").toLowerCase();
      if (rowStr.includes("peso") && (rowStr.includes("kg") || rowStr.includes("valor") || rowStr.includes("frete"))) {
        headerRow = i;
        break;
      }
    }
    const dataStart = headerRow >= 0 ? headerRow + 1 : 4;

    let importados = 0;
    let rotasAtualizadas = 0;
    const erros: string[] = [];

    // Detect nomeRota column from header; default=5 (original behavior)
    let nomeRotaCol = 5;
    let pesoMinCol = 6;
    if (headerRow >= 0) {
      const hRow = rows[headerRow] as any[];
      for (let c = 0; c < hRow.length; c++) {
        const v = String(hRow[c] ?? "").toLowerCase().trim();
        if (v === "rota" || v === "nome rota" || v === "nome_rota") {
          nomeRotaCol = c;
          pesoMinCol = c + 1;
          break;
        }
      }
    }

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      const nomeRota = String(row[nomeRotaCol] ?? "").trim();
      const pesoMin = parseFloat(String(row[pesoMinCol] ?? "0").replace(",", ".")) || 0;
      const pesoMax = parseFloat(String(row[pesoMinCol + 1] ?? "999999").replace(",", ".")) || 999999;
      const excessoKg = parseFloat(String(row[pesoMinCol + 2] ?? "0").replace(",", ".")) || 0;
      const valorKg = parseFloat(String(row[pesoMinCol + 3] ?? "0").replace(",", ".")) || 0;
      const percentualFrete = parseFloat(String(row[pesoMinCol + 4] ?? "0").replace(",", ".")) || 0;
      const valorMinimoFrete = parseFloat(String(row[pesoMinCol + 5] ?? "0").replace(",", ".")) || 0;

      if (!nomeRota) continue;

      try {
        // Match exact OR file name starts with DB name (e.g. "Barueri - RS - GERAL - TDA 58,37" → "Barueri - RS - GERAL")
        const rotaRows = await db.select({ id: rotasTable.id }).from(rotasTable)
          .where(and(
            eq(rotasTable.origemId, origemId),
            sql`(${rotasTable.nomeRota} = ${nomeRota} OR ${nomeRota} ILIKE ${rotasTable.nomeRota} || ' -%')`
          ))
          .limit(1);
        if (rotaRows.length === 0) { erros.push(`Linha ${i + 1}: Rota "${nomeRota}" não encontrada`); continue; }
        const rotaId = rotaRows[0].id;

        if (valorMinimoFrete > 0) {
          await db.update(rotasTable).set({ valorMinimoFrete }).where(eq(rotasTable.id, rotaId));
          rotasAtualizadas++;
        }

        const existing = await db.select({ id: cotacoesTable.id }).from(cotacoesTable)
          .where(and(eq(cotacoesTable.origemId, origemId), eq(cotacoesTable.rotaId, rotaId),
            eq(cotacoesTable.pesoMinimoKg as any, pesoMin)));
        if (existing.length > 0) {
          await db.update(cotacoesTable).set({ pesoMaximoKg: pesoMax, excessoKg, valorKg, percentualFrete })
            .where(eq(cotacoesTable.id, existing[0].id));
        } else {
          await db.insert(cotacoesTable).values({
            origemId, rotaId, pesoMinimoKg: pesoMin, pesoMaximoKg: pesoMax,
            excessoKg, valorKg, valorFixo: 0, percentualFrete,
          });
        }
        importados++;
      } catch (e: any) {
        erros.push(`Linha ${i + 1}: ${e.message}`);
      }
    }

    const linhasAnalisadas = rows.length - dataStart;
    let mensagem = `${importados} cotação(ões) importada(s).`;
    if (importados === 0 && linhasAnalisadas > 0 && erros.length === 0) {
      mensagem = `Nenhum dado importado. O arquivo foi lido (${linhasAnalisadas} linha(s) analisada(s)) mas as rotas não foram encontradas no sistema. Verifique se a coluna "Rota" do arquivo corresponde ao nome das rotas cadastradas nesta origem, ou baixe o modelo da planilha para conferir o formato esperado.`;
    }
    res.json({ importados, rotasAtualizadas, erros: erros.length, detalhes: erros.slice(0, 20), mensagem, linhasAnalisadas, colunaRota: nomeRotaCol });
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao processar arquivo", detalhe: e.message });
  }
});

// ── Modelo de Planilha Fretes ─────────────────────────────────────────────────

router.get("/origens/:origemId/modelo-fretes", async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  const [origem] = await db.select({ cidade: origensTable.cidade }).from(origensTable).where(eq(origensTable.id, origemId));
  const rotas = await db.select({ nomeRota: rotasTable.nomeRota }).from(rotasTable).where(eq(rotasTable.origemId, origemId)).orderBy(rotasTable.nomeRota);

  const data = [
    ["Simulador de Fretes - Modelo de Importação de Fretes"],
    ["INSTRUÇÕES: Preencha uma linha por faixa de peso. A coluna 'Rota' deve conter exatamente o nome da rota cadastrada no sistema."],
    ["Origem", ""],
    ["", "Transportadora", "Unidade", "Regra", "Rota", "Peso Mín (kg)", "Peso Lim (kg)", "Excesso", "Taxa/kg", "Frete %", "Frete Mín"],
    ...rotas.map(r => [
      "", "", origem?.cidade ?? "", "", r.nomeRota,
      0, 999999, 0, 0, 0, 0,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Highlight header row
  ws["A3"] = { v: "ROTAS CADASTRADAS NESTA ORIGEM:", t: "s" };
  XLSX.utils.book_append_sheet(wb, ws, "Modelo de Fretes");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="modelo_fretes_${origem?.cidade ?? origemId}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ── Modelo de Planilha Rotas ──────────────────────────────────────────────────

router.get("/origens/:origemId/modelo-rotas", async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  const [origem] = await db.select({ cidade: origensTable.cidade }).from(origensTable).where(eq(origensTable.id, origemId));

  const data = [
    ["Simulador de Fretes - Modelo de Importação de Rotas"],
    ["INSTRUÇÕES: Preencha uma linha por rota. IBGE Origem e IBGE Destino são códigos de 7 dígitos do IBGE."],
    ["Origem", ""],
    ["", "Transportadora", "Unidade", "Cotação", "IBGE Origem", "IBGE Destino", "CEP Início", "CEP Fim", "Método", "Prazo"],
    ["", "", origem?.cidade ?? "", "ROTA_EXEMPLO", "1234567", "7654321", "", "", "RODOVIARIO", 3],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Modelo de Rotas");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="modelo_rotas_${origem?.cidade ?? origemId}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ── Exportar Rotas ────────────────────────────────────────────────────────────

router.get("/origens/:origemId/exportar-rotas", async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  const [origem] = await db.select({ cidade: origensTable.cidade }).from(origensTable).where(eq(origensTable.id, origemId));
  const rotas = await db.select().from(rotasTable).where(eq(rotasTable.origemId, origemId)).orderBy(rotasTable.nomeRota);

  const data = [
    ["Simulador de Fretes - Exportação de Rotas"],
    [],
    ["Origem", ""],
    ["", "Transportadora", "Unidade", "Cotação", "IBGE Origem", "IBGE Destino", "CEP Início", "CEP Fim", "Método", "Prazo"],
    ...rotas.map(r => [
      "", "", origem?.cidade ?? "", r.nomeRota, r.ibgeOrigem, r.ibgeDestino,
      r.cepInicioFaixa ?? "", r.cepFimFaixa ?? "", r.metodoEnvio, r.prazoEntregaDias,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Prazos de frete");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="rotas_${origem?.cidade ?? origemId}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ── Exportar Fretes ───────────────────────────────────────────────────────────

router.get("/origens/:origemId/exportar-fretes", async (req, res): Promise<void> => {
  const origemId = parseInt(req.params.origemId, 10);
  const [origem] = await db.select({ cidade: origensTable.cidade }).from(origensTable).where(eq(origensTable.id, origemId));
  const cotacoes = await db.select({
    nomeRota: rotasTable.nomeRota,
    valorMinimoFrete: rotasTable.valorMinimoFrete,
    pesoMinimoKg: cotacoesTable.pesoMinimoKg,
    pesoMaximoKg: cotacoesTable.pesoMaximoKg,
    excessoKg: cotacoesTable.excessoKg,
    valorKg: cotacoesTable.valorKg,
    percentualFrete: cotacoesTable.percentualFrete,
  }).from(cotacoesTable)
    .leftJoin(rotasTable, eq(cotacoesTable.rotaId, rotasTable.id))
    .where(eq(cotacoesTable.origemId, origemId))
    .orderBy(rotasTable.nomeRota, cotacoesTable.pesoMinimoKg);

  const data = [
    ["Simulador de Fretes - Exportação de Fretes"],
    [],
    ["Origem", ""],
    ["", "Transportadora", "Unidade", "Regra", "Rota", "Peso Mín (kg)", "Peso Lim (kg)", "Excesso", "Taxa/kg", "Frete %", "Frete Mín"],
    ...cotacoes.map(c => [
      "", "", origem?.cidade ?? "", "", c.nomeRota ?? "",
      c.pesoMinimoKg, c.pesoMaximoKg, c.excessoKg, c.valorKg, c.percentualFrete, c.valorMinimoFrete,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Valores de frete");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="fretes_${origem?.cidade ?? origemId}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

export default router;
