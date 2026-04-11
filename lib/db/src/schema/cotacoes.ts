import { pgTable, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { origensTable } from "./origens";
import { rotasTable } from "./rotas";

export const cotacoesTable = pgTable("cotacoes", {
  id: serial("id").primaryKey(),
  origemId: integer("origem_id").notNull().references(() => origensTable.id, { onDelete: "cascade" }),
  rotaId: integer("rota_id").notNull().references(() => rotasTable.id, { onDelete: "cascade" }),
  pesoMinimoKg: real("peso_minimo_kg").notNull().default(0),
  pesoMaximoKg: real("peso_maximo_kg").notNull().default(999999),
  valorKg: real("valor_kg").notNull().default(0),
  valorFixo: real("valor_fixo").notNull().default(0),
  excessoKg: real("excesso_kg").notNull().default(0),
  percentualFrete: real("percentual_frete").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCotacaoSchema = createInsertSchema(cotacoesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCotacao = z.infer<typeof insertCotacaoSchema>;
export type Cotacao = typeof cotacoesTable.$inferSelect;
