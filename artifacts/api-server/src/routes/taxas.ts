import { Router, type IRouter } from "express";
import { eq, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { taxasEspeciaisTable } from "@workspace/db";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  ListTaxasParams,
  ListTaxasQueryParams,
  CreateTaxaParams,
  CreateTaxaBody,
  UpdateTaxaParams,
  UpdateTaxaBody,
  DeleteTaxaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function d(row: any) {
  return {
    ...row,
    criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.criadoEm ?? row.createdAt),
    atualizadoEm: row.atualizadoEm instanceof Date ? row.atualizadoEm.toISOString() : (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.atualizadoEm ?? row.updatedAt),
  };
}

// Parse a number or percentage string: "0,15%" → 0.15, "70" → 70, "" → null
function pNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "" || s === "-") return null;
  if (s.endsWith("%")) return parseFloat(s.slice(0, -1)) || null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

router.get("/origens/:origemId/taxas", async (req, res): Promise<void> => {
  const pathP = ListTaxasParams.safeParse(req.params);
  const queryP = ListTaxasQueryParams.safeParse(req.query);
  if (!pathP.success || !queryP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;
  const { page = 1, pageSize = 2000 } = queryP.data;
  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    db.select().from(taxasEspeciaisTable)
      .where(eq(taxasEspeciaisTable.origemId, origemId))
      .orderBy(taxasEspeciaisTable.ibgeDestino)
      .limit(pageSize).offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(taxasEspeciaisTable).where(eq(taxasEspeciaisTable.origemId, origemId)),
  ]);
  res.json({ data: rows.map(d), total: countRows[0]?.count ?? 0, page, pageSize });
});

// ── Export ──────────────────────────────────────────────────────────────────
router.get("/origens/:origemId/taxas/exportar", async (req, res): Promise<void> => {
  const pathP = ListTaxasParams.safeParse(req.params);
  if (!pathP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;

  const rows = await db.select().from(taxasEspeciaisTable)
    .where(eq(taxasEspeciaisTable.origemId, origemId))
    .orderBy(taxasEspeciaisTable.ibgeDestino);

  const wb = XLSX.utils.book_new();
  const data = [
    ["IBGE", "TDA (R$)", "TRT (R$)", "SUFRAMA (R$)", "Outras (R$)", "GRIS (%)", "Ad Valorem (%)"],
    ...rows.map(r => [
      r.ibgeDestino,
      r.tda || "",
      r.trt || "",
      r.suframa || "",
      r.outras || "",
      r.grisPercentual ?? "",
      r.adValorem ?? "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Taxas Especiais");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="taxas-especiais-${origemId}.xlsx"`);
  res.send(buf);
});

// ── Import ──────────────────────────────────────────────────────────────────
router.post("/origens/:origemId/taxas/importar", upload.single("arquivo"), async (req, res): Promise<void> => {
  const pathP = ListTaxasParams.safeParse(req.params);
  if (!pathP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;
  if (!req.file) { res.status(400).json({ error: "Nenhum arquivo enviado" }); return; }

  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  type RecordT = {
    ibgeDestino: string;
    tda: number; trt: number; suframa: number; outras: number;
    grisPercentual: number | null; grisMinimo: number | null;
    adValorem: number | null; adValoremMinimo: number | null;
  };

  const records: RecordT[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ibge = String(row[0] ?? "").trim();
    if (!ibge) continue;
    if (!/^\d{7}$/.test(ibge)) { errors.push(`Linha ${i + 1}: IBGE "${ibge}" inválido`); continue; }

    // Columns: IBGE | TDA | TRT | SUFRAMA | Outras | GRIS% | AdV%
    records.push({
      ibgeDestino: ibge,
      tda: pNum(row[1]) ?? 0,
      trt: pNum(row[2]) ?? 0,
      suframa: pNum(row[3]) ?? 0,
      outras: pNum(row[4]) ?? 0,
      grisPercentual: pNum(row[5]),
      grisMinimo: pNum(row[6]) !== null && !String(row[5] ?? "").includes("%") ? null : null, // handled below
      adValorem: pNum(row[6]),
      adValoremMinimo: null,
    });
  }

  if (records.length === 0) { res.status(422).json({ error: "Nenhum registro válido", erros: errors }); return; }

  const existentes = await db.select({ ibgeDestino: taxasEspeciaisTable.ibgeDestino })
    .from(taxasEspeciaisTable)
    .where(eq(taxasEspeciaisTable.origemId, origemId));
  const setExistentes = new Set(existentes.map(e => e.ibgeDestino));

  const inserir = records.filter(r => !setExistentes.has(r.ibgeDestino));
  const atualizar = records.filter(r => setExistentes.has(r.ibgeDestino));

  let inseridos = 0, atualizados = 0;

  if (inserir.length > 0) {
    await db.insert(taxasEspeciaisTable).values(inserir.map(r => ({ origemId, ...r, ativo: true })));
    inseridos = inserir.length;
  }
  for (const r of atualizar) {
    await db.update(taxasEspeciaisTable)
      .set({ tda: r.tda, trt: r.trt, suframa: r.suframa, outras: r.outras, grisPercentual: r.grisPercentual, adValorem: r.adValorem })
      .where(eq(taxasEspeciaisTable.ibgeDestino, r.ibgeDestino));
    atualizados++;
  }

  res.json({ inseridos, atualizados, erros: errors, total: inseridos + atualizados });
});

// ── Bulk create ──────────────────────────────────────────────────────────────
router.post("/origens/:origemId/taxas/bulk", async (req, res): Promise<void> => {
  const pathP = CreateTaxaParams.safeParse(req.params);
  if (!pathP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;
  const { ibges, trt = 0, tda = 0, suframa = 0, outras = 0, grisPercentual = null, adValorem = null } = req.body ?? {};
  if (!Array.isArray(ibges) || ibges.length === 0) { res.status(400).json({ error: "ibges deve ser um array não vazio" }); return; }

  const ibgesValidos: string[] = ibges.map((v: any) => String(v).trim()).filter(v => /^\d{7}$/.test(v));
  if (ibgesValidos.length === 0) { res.status(422).json({ error: "Nenhum IBGE válido (7 dígitos)" }); return; }

  const existentes = await db.select({ ibgeDestino: taxasEspeciaisTable.ibgeDestino })
    .from(taxasEspeciaisTable)
    .where(eq(taxasEspeciaisTable.origemId, origemId));
  const setExistentes = new Set(existentes.map(e => e.ibgeDestino));

  const novos = ibgesValidos.filter(i => !setExistentes.has(i));
  const duplicados = ibgesValidos.filter(i => setExistentes.has(i));

  if (novos.length > 0) {
    await db.insert(taxasEspeciaisTable).values(
      novos.map(ibge => ({ origemId, ibgeDestino: ibge, trt, tda, suframa, outras, grisPercentual, adValorem, ativo: true }))
    );
  }

  res.status(201).json({ inseridos: novos.length, duplicados, ibgesValidos, ibgesInvalidos: ibges.length - ibgesValidos.length });
});

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.post("/origens/:origemId/taxas", async (req, res): Promise<void> => {
  const pathP = CreateTaxaParams.safeParse(req.params);
  const bodyP = CreateTaxaBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos", detalhes: bodyP.error?.issues }); return; }
  const { origemId } = pathP.data;
  const data = bodyP.data;
  const [row] = await db.insert(taxasEspeciaisTable).values({
    origemId,
    ibgeDestino: data.ibgeDestino,
    trt: data.trt ?? 0,
    tda: data.tda ?? 0,
    suframa: data.suframa ?? 0,
    outras: data.outras ?? 0,
    grisPercentual: data.grisPercentual ?? null,
    grisMinimo: data.grisMinimo ?? null,
    adValorem: data.adValorem ?? null,
    adValoremMinimo: data.adValoremMinimo ?? null,
    ativo: data.ativo ?? true,
  }).returning();
  res.status(201).json(d({ ...row, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.put("/origens/:origemId/taxas/:id", async (req, res): Promise<void> => {
  const pathP = UpdateTaxaParams.safeParse(req.params);
  const bodyP = UpdateTaxaBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const data = bodyP.data;
  const [row] = await db.update(taxasEspeciaisTable).set({
    ibgeDestino: data.ibgeDestino,
    trt: data.trt ?? undefined,
    tda: data.tda ?? undefined,
    suframa: data.suframa ?? undefined,
    outras: data.outras ?? undefined,
    grisPercentual: data.grisPercentual !== undefined ? data.grisPercentual : undefined,
    grisMinimo: data.grisMinimo !== undefined ? data.grisMinimo : undefined,
    adValorem: data.adValorem !== undefined ? data.adValorem : undefined,
    adValoremMinimo: data.adValoremMinimo !== undefined ? data.adValoremMinimo : undefined,
    ativo: data.ativo ?? undefined,
  }).where(eq(taxasEspeciaisTable.id, pathP.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Taxa não encontrada" }); return; }
  res.json(d({ ...row, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.delete("/origens/:origemId/taxas", async (req, res): Promise<void> => {
  const pathP = ListTaxasParams.safeParse(req.params);
  if (!pathP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const result = await db.delete(taxasEspeciaisTable).where(eq(taxasEspeciaisTable.origemId, pathP.data.origemId));
  res.json({ excluidos: result.rowCount ?? 0 });
});

router.delete("/origens/:origemId/taxas/:id", async (req, res): Promise<void> => {
  const params = DeleteTaxaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  await db.delete(taxasEspeciaisTable).where(eq(taxasEspeciaisTable.id, params.data.id));
  res.status(204).send();
});

export default router;
