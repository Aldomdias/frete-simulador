import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  origensTable,
  transportadorasTable,
} from "@workspace/db";

const router: IRouter = Router();

function d(row: any) {
  return {
    ...row,
    criadoEm:
      row.criadoEm instanceof Date
        ? row.criadoEm.toISOString()
        : row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.criadoEm ?? row.createdAt,
    atualizadoEm:
      row.atualizadoEm instanceof Date
        ? row.atualizadoEm.toISOString()
        : row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : row.atualizadoEm ?? row.updatedAt,
  };
}

/**
 * Lista origens
 *
 * Regras:
 * - /origens?transportadoraId=0  => traz todas
 * - /origens?transportadoraId=12 => traz só da transportadora 12
 * - sem transportadoraId         => traz todas
 */
router.get("/origens", async (req, res): Promise<void> => {
  const transportadoraIdRaw = req.query.transportadoraId;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 200);
  const offset = (page - 1) * pageSize;

  const transportadoraId =
    transportadoraIdRaw !== undefined && transportadoraIdRaw !== null && transportadoraIdRaw !== ""
      ? Number(transportadoraIdRaw)
      : undefined;

  const conditions: any[] = [eq(origensTable.ativo, true), eq(transportadorasTable.ativo, true)];

  // Só filtra por transportadora se vier > 0
  if (transportadoraId && transportadoraId > 0) {
    conditions.push(eq(origensTable.transportadoraId, transportadoraId));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select({
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
        ativo: origensTable.ativo,
        criadoEm: origensTable.createdAt,
        atualizadoEm: origensTable.updatedAt,
      })
      .from(origensTable)
      .leftJoin(
        transportadorasTable,
        eq(origensTable.transportadoraId, transportadorasTable.id)
      )
      .where(where)
      .orderBy(origensTable.cidade, origensTable.uf)
      .limit(pageSize)
      .offset(offset),

    db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(origensTable)
      .leftJoin(
        transportadorasTable,
        eq(origensTable.transportadoraId, transportadorasTable.id)
      )
      .where(where),
  ]);

  res.json({
    data: rows.map(d),
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  });
});

export default router;