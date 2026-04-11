import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ibgeMunicipiosTable = pgTable("ibge_municipios", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  uf: text("uf").notNull(),
  cepInicio: text("cep_inicio"),
  cepFim: text("cep_fim"),
});

export const insertIbgeMunicipioSchema = createInsertSchema(ibgeMunicipiosTable).omit({ id: true });
export type InsertIbgeMunicipio = z.infer<typeof insertIbgeMunicipioSchema>;
export type IbgeMunicipio = typeof ibgeMunicipiosTable.$inferSelect;
