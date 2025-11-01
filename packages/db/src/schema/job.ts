import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const job = pgTable("job", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description").notNull(),
  url: text("url"),
  requiredSkills: json("required_skills").$type<string[]>().default([]),
  preferredSkills: json("preferred_skills").$type<string[]>().default([]),
  keywords: json("keywords")
    .$type<{ word: string; frequency: number }[]>()
    .default([]),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
