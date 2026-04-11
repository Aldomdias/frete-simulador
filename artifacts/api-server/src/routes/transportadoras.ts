import { Router, type IRouter } from "express";
import { eq, ilike, sql, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { transportadorasTable, origensTable } from "@workspace/db";
import {
  ListTransportadorasQueryParams,
  CreateTransportadoraBody,
  GetTransportadoraParams,
  UpdateTransportadoraParams,
  UpdateTransportadoraBody,
  DeleteTransportadoraParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function d(row: any) {
  return {
    ...row,
    criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.criadoEm ?? row.createdAt),
    atualizadoEm: row.atualizadoEm instanceof Date ? row.atualizadoEm.toISOString() : (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.atualizadoEm ?? row.updatedAt),
  };
}

router.get("/transportadoras", async (req, res): Promise<void> => {
  const query = ListTransportadorasQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { search, page = 1, pageSize = 20 } = query.data;

  const offset = (page - 1) * pageSize;
  const where = search ? ilike(transportadorasTable.nome, `%${search}%`) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select({
      id: transportadorasTable.id,
      nome: transportadorasTable.nome,
      ativo: transportadorasTable.ativo,
      totalOrigens: count(origensTable.id),
      criadoEm: transportadorasTable.createdAt,
      atualizadoEm: transportadorasTable.updatedAt,
    })
      .from(transportadorasTable)
      .leftJoin(origensTable, eq(origensTable.transportadoraId, transportadorasTable.id))
      .where(where)
      .groupBy(transportadorasTable.id, transportadorasTable.nome, transportadorasTable.ativo, transportadorasTable.createdAt, transportadorasTable.updatedAt)
      .orderBy(transportadorasTable.nome)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(transportadorasTable).where(where),
  ]);

  res.json({ data: rows.map(d), total: countRows[0]?.count ?? 0, page, pageSize });
});

router.post("/transportadoras", async (req, res): Promise<void> => {
  const parsed = CreateTransportadoraBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos", detalhes: parsed.error.issues }); return; }
  const [row] = await db.insert(transportadorasTable).values({
    nome: parsed.data.nome,
    ativo: parsed.data.ativo ?? true,
  }).returning();
  res.status(201).json(d({ ...row, totalOrigens: 0, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.get("/transportadoras/:id", async (req, res): Promise<void> => {
  const params = GetTransportadoraParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  const [row] = await db.select({
    id: transportadorasTable.id,
    nome: transportadorasTable.nome,
    ativo: transportadorasTable.ativo,
    criadoEm: transportadorasTable.createdAt,
    atualizadoEm: transportadorasTable.updatedAt,
  }).from(transportadorasTable).where(eq(transportadorasTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Transportadora não encontrada" }); return; }
  const [cnt] = await db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(origensTable).where(eq(origensTable.transportadoraId, row.id));
  res.json(d({ ...row, totalOrigens: cnt?.count ?? 0 }));
});

router.put("/transportadoras/:id", async (req, res): Promise<void> => {
  const params = UpdateTransportadoraParams.safeParse(req.params);
  const parsed = UpdateTransportadoraBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const [row] = await db.update(transportadorasTable)
    .set({ nome: parsed.data.nome, ativo: parsed.data.ativo })
    .where(eq(transportadorasTable.id, params.data.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Transportadora não encontrada" }); return; }
  const totalOrigens = await db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(origensTable).where(eq(origensTable.transportadoraId, row.id));
  res.json(d({ ...row, totalOrigens: totalOrigens[0]?.count ?? 0, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.delete("/transportadoras/:id", async (req, res): Promise<void> => {
  const params = DeleteTransportadoraParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  await db.delete(transportadorasTable).where(eq(transportadorasTable.id, params.data.id));
  res.status(204).send();
});

export default router;
