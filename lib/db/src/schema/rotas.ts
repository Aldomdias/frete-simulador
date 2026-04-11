import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { origensTable } from "./origens";

export const rotasTable = pgTable("rotas", {
  id: serial("id").primaryKey(),
  origemId: integer("origem_id").notNull().references(() => origensTable.id, { onDelete: "cascade" }),
  nomeRota: text("nome_rota").notNull(),
  ibgeOrigem: text("ibge_origem").notNull(),
  ibgeDestino: text("ibge_destino").notNull(),
  cepInicioFaixa: text("cep_inicio_faixa"),
  cepFimFaixa: text("cep_fim_faixa"),
  canal: text("canal").notNull().default("AMBOS"),
  metodoEnvio: text("metodo_envio").notNull().default("RODOVIARIO"),
  prazoEntregaDias: integer("prazo_entrega_dias").notNull().default(1),
  valorMinimoFrete: real("valor_minimo_frete").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRotaSchema = createInsertSchema(rotasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRota = z.infer<typeof insertRotaSchema>;
export type Rota = typeof rotasTable.$inferSelect;
