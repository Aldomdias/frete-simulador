import { Router, type IRouter } from "express";
import { eq, ilike, sql, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { origensTable, transportadorasTable, rotasTable } from "@workspace/db";
import {
  ListOrigensParams,
  ListOrigensQueryParams,
  CreateOrigemParams,
  CreateOrigemBody,
  GetOrigemParams,
  UpdateOrigemParams,
  UpdateOrigemBody,
  DeleteOrigemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function d(row: any) {
  return {
    ...row,
    criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.criadoEm ?? row.createdAt),
    atualizadoEm: row.atualizadoEm instanceof Date ? row.atualizadoEm.toISOString() : (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.atualizadoEm ?? row.updatedAt),
  };
}

function origemCols() {
  return {
    id: origensTable.id,
    transportadoraId: origensTable.transportadoraId,
    transportadoraNome: transportadorasTable.nome,
    canal: origensTable.canal,
    cidade: origensTable.cidade,
    uf: origensTable.uf,
    icms: origensTable.icms,
    icmsAliquota: origensTable.icmsAliquota,
    adValorem: origensTable.adValorem,
    adValoremMinimo: origensTable.adValoremMinimo,
    pedagio: origensTable.pedagio,
    grisPercentual: origensTable.grisPercentual,
    grisMinimo: origensTable.grisMinimo,
    tas: origensTable.tas,
    ctrcEmitido: origensTable.ctrcEmitido,
    cubagem: origensTable.cubagem,
    faixaDePeso: origensTable.faixaDePeso,
    observacoes: origensTable.observacoes,
    ativo: origensTable.ativo,
    criadoEm: origensTable.createdAt,
    atualizadoEm: origensTable.updatedAt,
  };
}

router.get("/transportadoras/:transportadoraId/origens", async (req, res): Promise<void> => {
  const pathP = ListOrigensParams.safeParse(req.params);
  const queryP = ListOrigensQueryParams.safeParse(req.query);
  if (!pathP.success || !queryP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { transportadoraId } = pathP.data;
  const { search, page = 1, pageSize = 50 } = queryP.data;
  const offset = (page - 1) * pageSize;

  const whereBase = eq(origensTable.transportadoraId, transportadoraId);
  const where = search ? sql`${whereBase} AND ${ilike(origensTable.cidade, `%${search}%`)}` : whereBase;

  const [rows, countRows] = await Promise.all([
    db.select({ ...origemCols(), totalRotas: count(rotasTable.id) })
      .from(origensTable)
      .leftJoin(transportadorasTable, eq(origensTable.transportadoraId, transportadorasTable.id))
      .leftJoin(rotasTable, eq(rotasTable.origemId, origensTable.id))
      .where(where)
      .groupBy(origensTable.id, transportadorasTable.nome)
      .orderBy(origensTable.cidade)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(origensTable).where(where),
  ]);
  res.json({ data: rows.map(d), total: countRows[0]?.count ?? 0, page, pageSize });
});

router.post("/transportadoras/:transportadoraId/origens", async (req, res): Promise<void> => {
  const pathP = CreateOrigemParams.safeParse(req.params);
  const bodyP = CreateOrigemBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos", detalhes: bodyP.error?.issues }); return; }
  const { transportadoraId } = pathP.data;
  const data = bodyP.data;
  const [row] = await db.insert(origensTable).values({
    transportadoraId,
    canal: data.canal ?? "B2C",
    cidade: data.cidade,
    uf: data.uf ?? "",
    icms: data.icms ?? false,
    icmsAliquota: data.icmsAliquota ?? 0,
    adValorem: data.adValorem ?? 0,
    adValoremMinimo: data.adValoremMinimo ?? 0,
    pedagio: data.pedagio ?? 0,
    grisPercentual: data.grisPercentual ?? 0,
    grisMinimo: data.grisMinimo ?? 0,
    tas: data.tas ?? 0,
    ctrcEmitido: data.ctrcEmitido ?? 0,
    cubagem: data.cubagem ?? 300,
    faixaDePeso: data.faixaDePeso ?? false,
    observacoes: data.observacoes ?? null,
    ativo: data.ativo ?? true,
  }).returning();
  const [t] = await db.select({ nome: transportadorasTable.nome }).from(transportadorasTable).where(eq(transportadorasTable.id, transportadoraId));
  res.status(201).json(d({ ...row, transportadoraNome: t?.nome ?? null, totalRotas: 0, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.get("/transportadoras/:transportadoraId/origens/:id", async (req, res): Promise<void> => {
  const params = GetOrigemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const [row] = await db.select({ ...origemCols(), totalRotas: count(rotasTable.id) })
    .from(origensTable)
    .leftJoin(transportadorasTable, eq(origensTable.transportadoraId, transportadorasTable.id))
    .leftJoin(rotasTable, eq(rotasTable.origemId, origensTable.id))
    .where(eq(origensTable.id, params.data.id))
    .groupBy(origensTable.id, transportadorasTable.nome);
  if (!row) { res.status(404).json({ error: "Origem não encontrada" }); return; }
  res.json(d(row));
});

router.put("/transportadoras/:transportadoraId/origens/:id", async (req, res): Promise<void> => {
  const pathP = UpdateOrigemParams.safeParse(req.params);
  const bodyP = UpdateOrigemBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const data = bodyP.data;
  const [row] = await db.update(origensTable).set({
    canal: data.canal ?? undefined,
    cidade: data.cidade,
    uf: data.uf ?? undefined,
    icms: data.icms ?? undefined,
    icmsAliquota: data.icmsAliquota ?? undefined,
    adValorem: data.adValorem ?? undefined,
    adValoremMinimo: data.adValoremMinimo ?? undefined,
    pedagio: data.pedagio ?? undefined,
    grisPercentual: data.grisPercentual ?? undefined,
    grisMinimo: data.grisMinimo ?? undefined,
    tas: data.tas ?? undefined,
    ctrcEmitido: data.ctrcEmitido ?? undefined,
    cubagem: data.cubagem ?? undefined,
    faixaDePeso: data.faixaDePeso ?? undefined,
    observacoes: data.observacoes ?? undefined,
    ativo: data.ativo ?? undefined,
  }).where(eq(origensTable.id, pathP.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Origem não encontrada" }); return; }
  const [t] = await db.select({ nome: transportadorasTable.nome }).from(transportadorasTable).where(eq(transportadorasTable.id, row.transportadoraId));
  const [tc] = await db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(rotasTable).where(eq(rotasTable.origemId, row.id));
  res.json(d({ ...row, transportadoraNome: t?.nome ?? null, totalRotas: tc?.count ?? 0, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.delete("/transportadoras/:transportadoraId/origens/:id", async (req, res): Promise<void> => {
  const params = DeleteOrigemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  await db.delete(origensTable).where(eq(origensTable.id, params.data.id));
  res.status(204).send();
});

export default router;
