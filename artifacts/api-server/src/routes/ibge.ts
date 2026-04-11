import { Router, type IRouter } from "express";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { ibgeMunicipiosTable } from "@workspace/db";
import { SearchIbgeQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ibge", async (req, res): Promise<void> => {
  const queryP = SearchIbgeQueryParams.safeParse(req.query);
  if (!queryP.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }
  const { q, uf, page = 1, pageSize = 20 } = queryP.data;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (q) conditions.push(or(ilike(ibgeMunicipiosTable.nome, `%${q}%`), ilike(ibgeMunicipiosTable.codigo, `%${q}%`)));
  if (uf) conditions.push(ilike(ibgeMunicipiosTable.uf, uf));
  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`;

  const [rows, countRows] = await Promise.all([
    db.select().from(ibgeMunicipiosTable).where(where).orderBy(ibgeMunicipiosTable.nome).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(ibgeMunicipiosTable).where(where),
  ]);
  res.json({ data: rows, total: countRows[0]?.count ?? 0, page, pageSize });
});

export default router;
