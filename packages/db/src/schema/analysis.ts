import { integer, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { job } from "./job";
import { resume } from "./resume";

export const analysis = pgTable("analysis", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobId: text("job_id")
    .notNull()
    .references(() => job.id, { onDelete: "cascade" }),
  resumeId: text("resume_id")
    .notNull()
    .references(() => resume.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(), // 0-100
  breakdown: json("breakdown")
    .$type<{
      skills: { score: number; weight: number };
      experience: { score: number; weight: number };
      keywords: { score: number; weight: number };
      education: { score: number; weight: number };
    }>()
    .notNull(),
  gaps: json("gaps")
    .$type<
      Array<{
        type: "skill" | "keyword" | "experience" | "education";
        missing: string;
        frequency?: number;
        importance: "high" | "medium" | "low";
      }>
    >()
    .default([]),
  recommendations: json("recommendations")
    .$type<
      Array<{
        section: string;
        current: string;
        suggested: string;
      }>
    >()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
