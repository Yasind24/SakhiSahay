import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const oscsTable = pgTable("oscs", {
  id: serial("id").primaryKey(),
  serialNo: integer("serial_no").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  administratorName: text("administrator_name").notNull(),
  administratorEmail: text("administrator_email"),
  address: text("address"),
});

export const insertOscSchema = createInsertSchema(oscsTable).omit({ id: true });
export type InsertOsc = z.infer<typeof insertOscSchema>;
export type Osc = typeof oscsTable.$inferSelect;
