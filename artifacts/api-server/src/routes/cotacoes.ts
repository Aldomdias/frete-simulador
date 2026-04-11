import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { cotacoesTable, rotasTable } from "@workspace/db";
import {
  ListCotacoesParams,
  ListCotacoesQueryParams,
  CreateCotacaoParams,
  CreateCotacaoBody,
  UpdateCotacaoParams,
  UpdateCotacaoBody,
  DeleteCotacaoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function d(row: any) {
  return {
    ...row,
    criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.criadoEm ?? row.createdAt),
    atualizadoEm: row.atualizadoEm instanceof Date ? row.atualizadoEm.toISOString() : (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.atualizadoEm ?? row.updatedAt),
  };
}

router.get("/origens/:origemId/cotacoes", async (req, res): Promise<void> => {
  const pathP = ListCotacoesParams.safeParse(req.params);
  const queryP = ListCotacoesQueryParams.safeParse(req.query);
  if (!pathP.success || !queryP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;
  const { rotaId, page = 1, pageSize = 200 } = queryP.data;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [eq(cotacoesTable.origemId, origemId)];
  if (rotaId) conditions.push(eq(cotacoesTable.rotaId, rotaId));
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select({
      id: cotacoesTable.id,
      origemId: cotacoesTable.origemId,
      rotaId: cotacoesTable.rotaId,
      nomeRota: rotasTable.nomeRota,
      pesoMinimoKg: cotacoesTable.pesoMinimoKg,
      pesoMaximoKg: cotacoesTable.pesoMaximoKg,
      valorKg: cotacoesTable.valorKg,
      valorFixo: cotacoesTable.valorFixo,
      excessoKg: cotacoesTable.excessoKg,
      percentualFrete: cotacoesTable.percentualFrete,
      ativo: cotacoesTable.ativo,
      criadoEm: cotacoesTable.createdAt,
      atualizadoEm: cotacoesTable.updatedAt,
    }).from(cotacoesTable)
      .leftJoin(rotasTable, eq(cotacoesTable.rotaId, rotasTable.id))
      .where(where)
      .orderBy(cotacoesTable.rotaId, cotacoesTable.pesoMinimoKg)
      .limit(pageSize).offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(cotacoesTable).where(where),
  ]);
  res.json({ data: rows.map(d), total: countRows[0]?.count ?? 0, page, pageSize });
});

router.post("/origens/:origemId/cotacoes", async (req, res): Promise<void> => {
  const pathP = CreateCotacaoParams.safeParse(req.params);
  const bodyP = CreateCotacaoBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos", detalhes: bodyP.error?.issues }); return; }
  const { origemId } = pathP.data;
  const data = bodyP.data;
  const [row] = await db.insert(cotacoesTable).values({
    origemId,
    rotaId: data.rotaId,
    pesoMinimoKg: data.pesoMinimoKg,
    pesoMaximoKg: data.pesoMaximoKg,
    valorKg: data.valorKg,
    valorFixo: data.valorFixo,
    excessoKg: data.excessoKg ?? 0,
    percentualFrete: data.percentualFrete,
    ativo: data.ativo ?? true,
  }).returning();
  const [rota] = await db.select({ nomeRota: rotasTable.nomeRota }).from(rotasTable).where(eq(rotasTable.id, row.rotaId));
  res.status(201).json(d({ ...row, nomeRota: rota?.nomeRota ?? null, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.put("/origens/:origemId/cotacoes/:id", async (req, res): Promise<void> => {
  const pathP = UpdateCotacaoParams.safeParse(req.params);
  const bodyP = UpdateCotacaoBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const data = bodyP.data;
  const [row] = await db.update(cotacoesTable).set({
    rotaId: data.rotaId,
    pesoMinimoKg: data.pesoMinimoKg,
    pesoMaximoKg: data.pesoMaximoKg,
    valorKg: data.valorKg,
    valorFixo: data.valorFixo,
    excessoKg: data.excessoKg ?? undefined,
    percentualFrete: data.percentualFrete,
    ativo: data.ativo ?? undefined,
  }).where(eq(cotacoesTable.id, pathP.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Cotação não encontrada" }); return; }
  const [rota] = await db.select({ nomeRota: rotasTable.nomeRota }).from(rotasTable).where(eq(rotasTable.id, row.rotaId));
  res.json(d({ ...row, nomeRota: rota?.nomeRota ?? null, criadoEm: row.createdAt, atualizadoEm: row.updatedAt }));
});

router.delete("/origens/:origemId/cotacoes/:id", async (req, res): Promise<void> => {
  const params = DeleteCotacaoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  await db.delete(cotacoesTable).where(eq(cotacoesTable.id, params.data.id));
  res.status(204).send();
});

export default router;
