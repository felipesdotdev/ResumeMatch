import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const resume = pgTable("resume", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: text("file_size"),
  text: text("text").notNull(),
  skills: json("skills").$type<string[]>().default([]),
  experience: json("experience")
    .$type<
      Array<{
        title: string;
        company: string;
        startDate?: string;
        endDate?: string;
        description?: string;
      }>
    >()
    .default([]),
  education: json("education")
    .$type<
      Array<{
        degree: string;
        institution: string;
        field?: string;
        graduationDate?: string;
      }>
    >()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
