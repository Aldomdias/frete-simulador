import { Router, type IRouter } from "express";
import { eq, ilike, sql, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { rotasTable } from "@workspace/db";
import {
  ListRotasParams,
  ListRotasQueryParams,
  CreateRotaParams,
  CreateRotaBody,
  UpdateRotaParams,
  UpdateRotaBody,
  DeleteRotaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function d(row: any) {
  return {
    ...row,
    criadoEm: row.criadoEm instanceof Date ? row.criadoEm.toISOString() : (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.criadoEm ?? row.createdAt),
    atualizadoEm: row.atualizadoEm instanceof Date ? row.atualizadoEm.toISOString() : (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.atualizadoEm ?? row.updatedAt),
  };
}

router.get("/origens/:origemId/rotas", async (req, res): Promise<void> => {
  const pathP = ListRotasParams.safeParse(req.params);
  const queryP = ListRotasQueryParams.safeParse(req.query);
  if (!pathP.success || !queryP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { origemId } = pathP.data;
  const { search, canal, page = 1, pageSize = 100 } = queryP.data;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [eq(rotasTable.origemId, origemId)];
  if (search) conditions.push(ilike(rotasTable.nomeRota, `%${search}%`));
  if (canal) conditions.push(eq(rotasTable.canal, canal));
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select().from(rotasTable).where(where).orderBy(rotasTable.nomeRota).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(rotasTable).where(where),
  ]);
  res.json({ data: rows.map(d), total: countRows[0]?.count ?? 0, page, pageSize });
});

router.post("/origens/:origemId/rotas", async (req, res): Promise<void> => {
  const pathP = CreateRotaParams.safeParse(req.params);
  const bodyP = CreateRotaBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos", detalhes: bodyP.error?.issues }); return; }
  const { origemId } = pathP.data;
  const data = bodyP.data;
  const [row] = await db.insert(rotasTable).values({
    origemId,
    nomeRota: data.nomeRota,
    ibgeOrigem: data.ibgeOrigem,
    ibgeDestino: data.ibgeDestino,
    cepInicioFaixa: data.cepInicioFaixa ?? null,
    cepFimFaixa: data.cepFimFaixa ?? null,
    canal: data.canal ?? "AMBOS",
    metodoEnvio: data.metodoEnvio ?? "RODOVIARIO",
    prazoEntregaDias: data.prazoEntregaDias,
    valorMinimoFrete: data.valorMinimoFrete,
    ativo: data.ativo ?? true,
  }).returning();
  res.status(201).json(d(row));
});

router.put("/origens/:origemId/rotas/:id", async (req, res): Promise<void> => {
  const pathP = UpdateRotaParams.safeParse(req.params);
  const bodyP = UpdateRotaBody.safeParse(req.body);
  if (!pathP.success || !bodyP.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
  const data = bodyP.data;
  const [row] = await db.update(rotasTable).set({
    nomeRota: data.nomeRota,
    ibgeOrigem: data.ibgeOrigem,
    ibgeDestino: data.ibgeDestino,
    cepInicioFaixa: data.cepInicioFaixa ?? null,
    cepFimFaixa: data.cepFimFaixa ?? null,
    canal: data.canal ?? undefined,
    metodoEnvio: data.metodoEnvio ?? undefined,
    prazoEntregaDias: data.prazoEntregaDias,
    valorMinimoFrete: data.valorMinimoFrete,
    ativo: data.ativo ?? undefined,
  }).where(eq(rotasTable.id, pathP.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Rota não encontrada" }); return; }
  res.json(d(row));
});

router.delete("/origens/:origemId/rotas/:id", async (req, res): Promise<void> => {
  const params = DeleteRotaParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  await db.delete(rotasTable).where(eq(rotasTable.id, params.data.id));
  res.status(204).send();
});

export default router;
