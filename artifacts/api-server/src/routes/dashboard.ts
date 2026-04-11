import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { transportadorasTable, origensTable, rotasTable, cotacoesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/resumo", async (req, res): Promise<void> => {
  const [[t], [o], [r], [c]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(transportadorasTable),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(origensTable),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(rotasTable),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) }).from(cotacoesTable),
  ]);
  res.json({
    totalTransportadoras: t?.count ?? 0,
    totalOrigens: o?.count ?? 0,
    totalRotas: r?.count ?? 0,
    totalCotacoes: c?.count ?? 0,
  });
});

export default router;
