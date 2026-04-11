import { Router, type IRouter } from "express";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  origensTable, rotasTable, cotacoesTable, transportadorasTable,
  ibgeMunicipiosTable, taxasEspeciaisTable,
} from "@workspace/db";
import { SimulacaoMassaBody } from "@workspace/api-zod";

// ── ICMS 2026 ────────────────────────────────────────────────────────────────
const ICMS_DEVELOPED = new Set(["MG", "PR", "RS", "RJ", "SC", "SP"]);
const ICMS_INTRASTATE: Record<string, number> = {
  AC: 19, AL: 20, AM: 20, AP: 18, BA: 20.5, CE: 20, DF: 20, ES: 17,
  GO: 19, MA: 23, MT: 17, MS: 17, MG: 18, PA: 19, PB: 20, PR: 19.5,
  PE: 20.5, PI: 22.5, RN: 20, RS: 17, RJ: 22, RO: 19.5, RR: 20,
  SC: 17, SP: 18, SE: 20, TO: 20,
};
function getIcmsAliquota(orig: string, dest: string): number {
  const o = orig?.toUpperCase().trim(), d = dest?.toUpperCase().trim();
  if (!o || !d) return 12;
  if (o === d) return ICMS_INTRASTATE[o] ?? 12;
  if (ICMS_DEVELOPED.has(o)) return ICMS_DEVELOPED.has(d) ? 12 : 7;
  return 12;
}

// ── Freight calculation (pure fn) ────────────────────────────────────────────
type OrigemRow = {
  id: number; transportadoraId: number; transportadoraNome: string | null;
  cidade: string; uf: string; canal: string; icms: boolean; icmsAliquota: number | null;
  adValorem: number; adValoremMinimo: number; pedagio: number;
  grisPercentual: number; grisMinimo: number; tas: number; ctrcEmitido: number | null;
};
type RotaRow = {
  id: number; origemId: number; nomeRota: string; ibgeDestino: string;
  canal: string; metodoEnvio: string; prazoEntregaDias: number;
  valorMinimoFrete: number; cepInicioFaixa: string | null; cepFimFaixa: string | null; ativo: boolean;
};
type CotacaoRow = {
  id: number; origemId: number; rotaId: number; ativo: boolean;
  pesoMinimoKg: number; pesoMaximoKg: number;
  valorKg: number; valorFixo: number; percentualFrete: number;
};
type TaxaRow = {
  origemId: number; ibgeDestino: string;
  trt: number | null; tda: number | null; suframa: number | null; outras: number | null;
  adValorem: number | null; adValoremMinimo: number | null;
  grisPercentual: number | null; grisMinimo: number | null;
};

function calcCenario(
  origem: OrigemRow, rota: RotaRow, cotacao: CotacaoRow,
  matchIbge: string, destinoUf: string, destinoMunicipio: string,
  taxa: TaxaRow | undefined, pesoKg: number, valorNf: number,
) {
  const valorPorKg = cotacao.valorKg > 0 ? pesoKg * cotacao.valorKg : 0;
  const valorFixoCalc = cotacao.valorFixo > 0 ? cotacao.valorFixo : 0;
  const valorPorPct = cotacao.percentualFrete > 0 ? valorNf * cotacao.percentualFrete / 100 : 0;
  const valorFretePeso = Math.max(valorPorKg, valorFixoCalc, valorPorPct);
  const tipoFrete = valorPorPct > 0 && valorPorPct >= valorPorKg && valorPorPct >= valorFixoCalc
    ? "percentual" : "peso";

  const valorTrt = taxa?.trt ?? 0;
  const valorTda = taxa?.tda ?? 0;
  const adValoremPct = taxa?.adValorem != null ? taxa.adValorem : origem.adValorem;
  const adValoremMin = taxa?.adValoremMinimo != null ? taxa.adValoremMinimo : origem.adValoremMinimo;
  const grisPct = taxa?.grisPercentual != null ? taxa.grisPercentual : origem.grisPercentual;
  const grisMin = taxa?.grisMinimo != null ? taxa.grisMinimo : origem.grisMinimo;

  const valorAdValorem = adValoremPct > 0 ? Math.max(valorNf * (adValoremPct / 100), adValoremMin > 0 ? adValoremMin : 0) : 0;
  const valorGris = grisPct > 0 ? Math.max(valorNf * (grisPct / 100), grisMin) : 0;
  const valorPedagio = origem.pedagio > 0 ? Math.ceil(pesoKg / 100) * origem.pedagio : 0;
  const valorTas = origem.tas ?? 0;
  const valorCtrc = origem.ctrcEmitido ?? 0;
  const valorSuframa = taxa?.suframa ?? 0;
  const valorOutras = taxa?.outras ?? 0;

  const subtotal = valorFretePeso + valorAdValorem + valorGris + valorPedagio
    + valorTas + valorCtrc + valorTrt + valorTda + valorSuframa + valorOutras;

  const icmsAliquota = origem.icms
    ? ((origem.icmsAliquota ?? 0) > 0 ? (origem.icmsAliquota ?? 0) : getIcmsAliquota(origem.uf, destinoUf))
    : 0;
  const valorIcms = icmsAliquota > 0 ? +(subtotal / (1 - icmsAliquota / 100) - subtotal).toFixed(2) : 0;

  let valorTotal = subtotal + valorIcms;
  let valorMinimoAplicado = false;
  if (rota.valorMinimoFrete > 0 && valorTotal < rota.valorMinimoFrete) {
    valorTotal = rota.valorMinimoFrete;
    valorMinimoAplicado = true;
  }

  const percentualNf = valorNf > 0 ? +(valorTotal / valorNf * 100).toFixed(2) : 0;

  return {
    transportadora: origem.transportadoraNome ?? "",
    origemCidade: origem.cidade,
    origemUf: origem.uf,
    origemId: origem.id,
    transportadoraId: origem.transportadoraId,
    rotaId: rota.id,
    nomeRota: rota.nomeRota,
    canal: rota.canal,
    metodoEnvio: rota.metodoEnvio,
    prazoEntregaDias: rota.prazoEntregaDias,
    ibgeDestino: matchIbge,
    destinoMunicipio,
    destinoUf,
    tipoFrete,
    valorFretePeso: +valorFretePeso.toFixed(2),
    valorAdValorem: +valorAdValorem.toFixed(2),
    valorGris: +valorGris.toFixed(2),
    valorPedagio: +valorPedagio.toFixed(2),
    valorTas: +valorTas.toFixed(2),
    valorCtrc: +valorCtrc.toFixed(2),
    valorTrt: +valorTrt.toFixed(2),
    valorTda: +valorTda.toFixed(2),
    valorSuframa: +valorSuframa.toFixed(2),
    valorOutras: +valorOutras.toFixed(2),
    valorIcms: +valorIcms.toFixed(2),
    icmsAliquota,
    valorTotal: +valorTotal.toFixed(2),
    valorMinimoAplicado,
    percentualNf,
  };
}

const router: IRouter = Router();

router.post("/simulacao", async (req, res): Promise<void> => {
  const bodyP = SimulacaoMassaBody.safeParse(req.body);
  if (!bodyP.success) { res.status(400).json({ error: "Dados inválidos", detalhes: bodyP.error.issues }); return; }

  const { modo = "destino", destino, transportadoraId, origemId, origemFiltroId, pesoKg, valorNf, canal } = bodyP.data;
  const modoEfetivo = modo;

  // ── 1. Resolve destination IBGE (modo=destino only) ───────────────────────
  const ibgeUfMap = new Map<string, string>();
  const ibgeCidadeMap = new Map<string, string>();
  let ibgeCodigos = new Set<string>();
  let cepMatch: string | null = null;
  let descricao = "";

  if (modoEfetivo === "destino") {
    const destinoNorm = (destino ?? "").trim();
    descricao = destinoNorm;
    cepMatch = /^\d{5,8}$/.test(destinoNorm.replace(/\D/g, ''))
      ? destinoNorm.replace(/\D/g, '').padEnd(8, '0') : null;

    const ibgeMunicipios = await db.select().from(ibgeMunicipiosTable).where(or(
      sql`LOWER(${ibgeMunicipiosTable.nome}) LIKE LOWER(${'%' + destinoNorm + '%'})`,
      sql`${ibgeMunicipiosTable.codigo} = ${destinoNorm}`,
    )).limit(20);
    for (const m of ibgeMunicipios) {
      ibgeCodigos.add(m.codigo); ibgeUfMap.set(m.codigo, m.uf); ibgeCidadeMap.set(m.codigo, m.nome);
    }
    if (ibgeCodigos.size === 0 && /^\d{7}$/.test(destinoNorm)) ibgeCodigos.add(destinoNorm);
  }

  // ── 2. Load all active origens ────────────────────────────────────────────
  const allOrigens: OrigemRow[] = await db.select({
    id: origensTable.id,
    transportadoraId: origensTable.transportadoraId,
    transportadoraNome: transportadorasTable.nome,
    cidade: origensTable.cidade,
    uf: origensTable.uf,
    canal: origensTable.canal,
    icms: origensTable.icms,
    icmsAliquota: origensTable.icmsAliquota,
    adValorem: origensTable.adValorem,
    adValoremMinimo: origensTable.adValoremMinimo,
    pedagio: origensTable.pedagio,
    grisPercentual: origensTable.grisPercentual,
    grisMinimo: origensTable.grisMinimo,
    tas: origensTable.tas,
    ctrcEmitido: origensTable.ctrcEmitido,
  }).from(origensTable)
    .leftJoin(transportadorasTable, eq(origensTable.transportadoraId, transportadorasTable.id))
    .where(and(eq(origensTable.ativo, true), eq(transportadorasTable.ativo, true)));

  // Filter origens for the selected mode
  let origens: OrigemRow[];
  if (modoEfetivo === "transportadora" && transportadoraId) {
    const base = allOrigens.filter(o => o.transportadoraId === transportadoraId);
    origens = origemFiltroId ? base.filter(o => o.id === origemFiltroId) : base;
    const nome = allOrigens.find(o => o.transportadoraId === transportadoraId)?.transportadoraNome ?? `#${transportadoraId}`;
    const origemLabel = origemFiltroId ? (origens[0] ? ` / ${origens[0].cidade}` : "") : "";
    descricao = `Transportadora: ${nome}${origemLabel}`;
  } else if (modoEfetivo === "origem" && origemId) {
    origens = allOrigens.filter(o => o.id === origemId);
    const o = origens[0];
    descricao = o ? `Origem: ${o.cidade}/${o.uf} (${o.transportadoraNome})` : `Origem #${origemId}`;
  } else {
    origens = allOrigens;
  }

  const origemIds = origens.map(o => o.id);
  if (origemIds.length === 0) {
    res.json({ descricao, pesoKg, valorNf, canal: canal ?? null, cenarios: [], totalEncontrados: 0 });
    return;
  }

  // ── 3. Load routes for selected origens ───────────────────────────────────
  const rotaWhere: any[] = [inArray(rotasTable.origemId, origemIds), eq(rotasTable.ativo, true)];
  if (canal) rotaWhere.push(or(eq(rotasTable.canal, canal), eq(rotasTable.canal, "AMBOS")));
  const todasRotas: RotaRow[] = await db.select().from(rotasTable).where(and(...rotaWhere));

  // ── 4. Resolve ibge codes from routes (non-destino modes) ────────────────
  if (modoEfetivo !== "destino") {
    const allRotaIbge = [...new Set(todasRotas.map(r => r.ibgeDestino).filter(Boolean))];
    if (allRotaIbge.length > 0) {
      const ibgeMunicipios = await db.select().from(ibgeMunicipiosTable).where(
        inArray(ibgeMunicipiosTable.codigo, allRotaIbge)
      );
      for (const m of ibgeMunicipios) { ibgeUfMap.set(m.codigo, m.uf); ibgeCidadeMap.set(m.codigo, m.nome); }
    }
  }

  const rotasPorOrigem = new Map<number, RotaRow[]>();
  for (const rota of todasRotas) {
    if (!rotasPorOrigem.has(rota.origemId)) rotasPorOrigem.set(rota.origemId, []);
    rotasPorOrigem.get(rota.origemId)!.push(rota);
  }

  // ── 5. Load cotacoes for selected origens ─────────────────────────────────
  const todasCotacoes: CotacaoRow[] = await db.select().from(cotacoesTable).where(
    and(inArray(cotacoesTable.origemId, origemIds), eq(cotacoesTable.ativo, true))
  );
  const rotaIdToNome = new Map<number, string>();
  for (const r of todasRotas) rotaIdToNome.set(r.id, r.nomeRota);

  const cotacoesPorOrigemNome = new Map<string, CotacaoRow[]>();
  for (const cot of todasCotacoes) {
    const nomeRota = rotaIdToNome.get(cot.rotaId); if (!nomeRota) continue;
    const key = `${cot.origemId}__${nomeRota}`;
    if (!cotacoesPorOrigemNome.has(key)) cotacoesPorOrigemNome.set(key, []);
    cotacoesPorOrigemNome.get(key)!.push(cot);
  }

  // ── 6. Load taxas especiais ───────────────────────────────────────────────
  const taxasIbgeCodes = modoEfetivo === "destino"
    ? [...ibgeCodigos]
    : [...new Set(todasRotas.map(r => r.ibgeDestino).filter(Boolean))];

  const taxasMap = new Map<string, TaxaRow>();
  if (taxasIbgeCodes.length > 0) {
    const taxas = await db.select().from(taxasEspeciaisTable).where(
      and(inArray(taxasEspeciaisTable.origemId, origemIds), inArray(taxasEspeciaisTable.ibgeDestino, taxasIbgeCodes), eq(taxasEspeciaisTable.ativo, true))
    );
    for (const t of taxas) taxasMap.set(`${t.origemId}__${t.ibgeDestino}`, t as TaxaRow);
  }

  // ── 7. Calculate cenarios for selected origens ────────────────────────────
  const cenarios: any[] = [];
  const dedupeKey = new Set<string>();

  function processCenarios(origensToProcess: OrigemRow[], rotasSource: RotaRow[], cotacoesSource: CotacaoRow[], cotacoesNomeMap: Map<string, CotacaoRow[]>, taxasSource: Map<string, TaxaRow>) {
    const result: any[] = [];
    const dedupe = new Set<string>();

    const rotasByOrigem = new Map<number, RotaRow[]>();
    for (const r of rotasSource) {
      if (!rotasByOrigem.has(r.origemId)) rotasByOrigem.set(r.origemId, []);
      rotasByOrigem.get(r.origemId)!.push(r);
    }

    for (const origem of origensToProcess) {
      if (canal && origem.canal && origem.canal !== canal) continue;
      const rotas = rotasByOrigem.get(origem.id) ?? [];
      for (const rota of rotas) {
        let matchIbge: string | null = null;

        if (modoEfetivo === "destino") {
          if (ibgeCodigos.has(rota.ibgeDestino)) matchIbge = rota.ibgeDestino;
          else if (ibgeCodigos.size === 0 && /^\d{7}$/.test((destino ?? "").trim()) && rota.ibgeDestino === destino?.trim()) matchIbge = rota.ibgeDestino;
          if (!matchIbge && cepMatch && rota.cepInicioFaixa && rota.cepFimFaixa) {
            const cn = parseInt(cepMatch.substring(0, 8));
            const ci = parseInt(rota.cepInicioFaixa.replace(/\D/g, '').padEnd(8, '0').substring(0, 8));
            const cf = parseInt(rota.cepFimFaixa.replace(/\D/g, '').padEnd(8, '0').substring(0, 8));
            if (!isNaN(cn) && !isNaN(ci) && !isNaN(cf) && cn >= ci && cn <= cf) matchIbge = rota.ibgeDestino;
          }
          if (!matchIbge) continue;
        } else {
          matchIbge = rota.ibgeDestino;
        }

        const destinoUf = ibgeUfMap.get(matchIbge) ?? "";
        const destinoMunicipio = ibgeCidadeMap.get(matchIbge) ?? "";

        const candidatas = cotacoesNomeMap.get(`${origem.id}__${rota.nomeRota}`) ?? [];
        const direta = cotacoesSource.filter(c => c.rotaId === rota.id && c.ativo && c.pesoMinimoKg <= pesoKg && c.pesoMaximoKg >= pesoKg);
        const filtered = [...candidatas.filter(c => c.pesoMinimoKg <= pesoKg && c.pesoMaximoKg >= pesoKg), ...direta];
        const seen = new Set<number>();
        const unique = filtered.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
        if (unique.length === 0) continue;

        for (const cotacao of unique) {
          const dk = `${origem.id}_${rota.nomeRota}_${cotacao.id}`;
          if (dedupe.has(dk)) continue; dedupe.add(dk);
          const taxa = taxasSource.get(`${origem.id}__${matchIbge}`);
          result.push(calcCenario(origem, rota, cotacao, matchIbge, destinoUf, destinoMunicipio, taxa, pesoKg, valorNf));
        }
      }
    }
    return result;
  }

  const selectedCenarios = processCenarios(origens, todasRotas, todasCotacoes, cotacoesPorOrigemNome, taxasMap);
  selectedCenarios.sort((a, b) => a.valorTotal - b.valorTotal);

  // ── 8. Market comparison (only for transportadora mode) ───────────────────
  let resumo: any = undefined;

  if (modoEfetivo === "transportadora" && transportadoraId) {
    // Collect unique ibge codes from our results
    const uniqueIbges = [...new Set(selectedCenarios.map((c: any) => c.ibgeDestino))];

    if (uniqueIbges.length > 0) {
      // Load ALL other transportadoras' routes for those IBGE destinations
      const allOrigemIds = allOrigens.map(o => o.id);
      const allRotasForIbges = await db.select().from(rotasTable).where(
        and(
          inArray(rotasTable.origemId, allOrigemIds),
          inArray(rotasTable.ibgeDestino, uniqueIbges),
          eq(rotasTable.ativo, true),
          ...(canal ? [or(eq(rotasTable.canal, canal), eq(rotasTable.canal, "AMBOS"))] : []),
        )
      );
      const allCotacoesForComp = await db.select().from(cotacoesTable).where(
        and(inArray(cotacoesTable.origemId, allOrigemIds), eq(cotacoesTable.ativo, true))
      );
      const allTaxasForComp = await db.select().from(taxasEspeciaisTable).where(
        and(inArray(taxasEspeciaisTable.origemId, allOrigemIds), inArray(taxasEspeciaisTable.ibgeDestino, uniqueIbges), eq(taxasEspeciaisTable.ativo, true))
      );

      // Also resolve ibge→uf/cidade for comparison ibges
      const compIbgeMunicipios = await db.select().from(ibgeMunicipiosTable).where(
        inArray(ibgeMunicipiosTable.codigo, uniqueIbges)
      );
      for (const m of compIbgeMunicipios) { ibgeUfMap.set(m.codigo, m.uf); ibgeCidadeMap.set(m.codigo, m.nome); }

      const compRotaIdToNome = new Map<number, string>();
      for (const r of allRotasForIbges) compRotaIdToNome.set(r.id, r.nomeRota);

      const compCotacoesByOrigemNome = new Map<string, CotacaoRow[]>();
      for (const cot of allCotacoesForComp) {
        const nomeRota = compRotaIdToNome.get(cot.rotaId); if (!nomeRota) continue;
        const key = `${cot.origemId}__${nomeRota}`;
        if (!compCotacoesByOrigemNome.has(key)) compCotacoesByOrigemNome.set(key, []);
        compCotacoesByOrigemNome.get(key)!.push(cot);
      }

      const compTaxasMap = new Map<string, TaxaRow>();
      for (const t of allTaxasForComp) compTaxasMap.set(`${t.origemId}__${t.ibgeDestino}`, t as TaxaRow);

      // Temporarily switch modoEfetivo logic for full calc
      const allCompCenarios = processCenarios(allOrigens, allRotasForIbges as RotaRow[], allCotacoesForComp as CotacaoRow[], compCotacoesByOrigemNome, compTaxasMap);

      // Build map: ibgeDestino → cheapest cenario (all transportadoras)
      const bestByIbge = new Map<string, any>();
      for (const c of allCompCenarios) {
        const existing = bestByIbge.get(c.ibgeDestino);
        if (!existing || c.valorTotal < existing.valorTotal) bestByIbge.set(c.ibgeDestino, c);
      }

      // Attach comparison to selected cenarios
      let rotasGanhas = 0, totalDifGanhas = 0, totalDifPerdidas = 0, rotasPerdidas = 0;

      for (const c of selectedCenarios) {
        const melhor = bestByIbge.get(c.ibgeDestino);
        if (melhor) {
          const diferenca = +(c.valorTotal - melhor.valorTotal).toFixed(2);
          const ganhei = c.valorTotal <= melhor.valorTotal + 0.01;
          c.melhorMercado = {
            valorTotal: melhor.valorTotal,
            transportadora: melhor.transportadora,
            origemCidade: melhor.origemCidade,
            origemUf: melhor.origemUf,
          };
          c.ganhei = ganhei;
          c.diferencaMercado = diferenca;
          if (ganhei) { rotasGanhas++; totalDifGanhas += 0; }
          else { rotasPerdidas++; totalDifPerdidas += diferenca; }
        } else {
          c.melhorMercado = null;
          c.ganhei = true;
          c.diferencaMercado = 0;
          rotasGanhas++;
        }
      }

      const totalRotas = selectedCenarios.length;
      resumo = {
        totalRotas,
        rotasGanhas,
        rotasPerdidas,
        percentualGanhas: totalRotas > 0 ? +(rotasGanhas / totalRotas * 100).toFixed(1) : 0,
        economiaMedia: 0,
        diferencaMedia: rotasPerdidas > 0 ? +(totalDifPerdidas / rotasPerdidas).toFixed(2) : 0,
      };
    }
  }

  res.json({
    descricao,
    pesoKg,
    valorNf,
    canal: canal ?? null,
    cenarios: selectedCenarios,
    totalEncontrados: selectedCenarios.length,
    resumo,
  });
});

export default router;
