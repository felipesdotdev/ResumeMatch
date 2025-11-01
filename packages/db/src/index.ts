import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { job } from "./schema/job.js";
import { resume } from "./schema/resume.js";
import { todo } from "./schema/todo.js";

export { analysis } from "./schema/analysis.js";
export { job } from "./schema/job.js";
export { resume } from "./schema/resume.js";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
// neonConfig.poolQueryViaFetch = true

// Load env for local/dev when not injected by the runtime
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: "../../apps/server/.env" });
}

const sql = neon(process.env.DATABASE_URL || "");
export const db = drizzle(sql);

export type TodoRecord = {
  id: number;
  text: string;
  completed: boolean;
};

export async function getAllTodos(): Promise<TodoRecord[]> {
  return (await db.select().from(todo)) as TodoRecord[];
}

export async function getTodoById(id: number): Promise<TodoRecord | undefined> {
  const rows = (await db
    .select()
    .from(todo)
    .where(eq(todo.id, id))) as TodoRecord[];
  return rows[0];
}

export async function createTodo(title: string): Promise<TodoRecord> {
  const inserted = (await db
    .insert(todo)
    .values({ text: title, completed: false })
    .returning()) as TodoRecord[];

  if (!inserted[0]) {
    throw new Error("Failed to create todo");
  }

  return inserted[0];
}

export async function updateTodo(
  id: number,
  values: Partial<Pick<TodoRecord, "text" | "completed">>
): Promise<TodoRecord | undefined> {
  const updated = (await db
    .update(todo)
    .set(values)
    .where(eq(todo.id, id))
    .returning()) as TodoRecord[];
  return updated[0];
}

export async function deleteTodo(id: number): Promise<void> {
  await db.delete(todo).where(eq(todo.id, id));
}

export type JobRecord = {
  id: string;
  title: string;
  company: string | null;
  description: string;
  url: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: { word: string; frequency: number }[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function createJob(data: {
  title: string;
  company?: string;
  description: string;
  url?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  keywords?: { word: string; frequency: number }[];
  userId: string;
}): Promise<JobRecord> {
  const inserted = (await db
    .insert(job)
    .values({
      title: data.title,
      company: data.company || null,
      description: data.description,
      url: data.url || null,
      requiredSkills: data.requiredSkills || [],
      preferredSkills: data.preferredSkills || [],
      keywords: data.keywords || [],
      userId: data.userId,
    })
    .returning()) as JobRecord[];

  if (!inserted[0]) {
    throw new Error("Failed to create job");
  }

  return inserted[0];
}

export async function getJobById(id: string): Promise<JobRecord | undefined> {
  const rows = (await db
    .select()
    .from(job)
    .where(eq(job.id, id))) as JobRecord[];
  return rows[0];
}

export async function getJobsByUserId(userId: string): Promise<JobRecord[]> {
  return (await db
    .select()
    .from(job)
    .where(eq(job.userId, userId))) as JobRecord[];
}

export type ResumeRecord = {
  id: string;
  userId: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: string | null;
  text: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    field?: string;
    graduationDate?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export async function createResume(data: {
  userId: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    field?: string;
    graduationDate?: string;
  }>;
}): Promise<ResumeRecord> {
  const inserted = (await db
    .insert(resume)
    .values({
      userId: data.userId,
      text: data.text,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      skills: data.skills || [],
      experience: data.experience || [],
      education: data.education || [],
    })
    .returning()) as ResumeRecord[];

  if (!inserted[0]) {
    throw new Error("Failed to create resume");
  }

  return inserted[0];
}

export async function getResumeById(
  id: string
): Promise<ResumeRecord | undefined> {
  const rows = (await db
    .select()
    .from(resume)
    .where(eq(resume.id, id))) as ResumeRecord[];
  return rows[0];
}

export async function getResumesByUserId(
  userId: string
): Promise<ResumeRecord[]> {
  return (await db
    .select()
    .from(resume)
    .where(eq(resume.userId, userId))) as ResumeRecord[];
}

import { analysis } from "./schema/analysis.js";

export type AnalysisRecord = {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  overallScore: number;
  breakdown: {
    skills: { score: number; weight: number };
    experience: { score: number; weight: number };
    keywords: { score: number; weight: number };
    education: { score: number; weight: number };
  };
  gaps: Array<{
    type: "skill" | "keyword" | "experience" | "education";
    missing: string;
    frequency?: number;
    importance: "high" | "medium" | "low";
  }>;
  recommendations: Array<{
    section: string;
    current: string;
    suggested: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export async function createAnalysis(data: {
  userId: string;
  jobId: string;
  resumeId: string;
  overallScore: number;
  breakdown: {
    skills: { score: number; weight: number };
    experience: { score: number; weight: number };
    keywords: { score: number; weight: number };
    education: { score: number; weight: number };
  };
  gaps?: Array<{
    type: "skill" | "keyword" | "experience" | "education";
    missing: string;
    frequency?: number;
    importance: "high" | "medium" | "low";
  }>;
  recommendations?: Array<{
    section: string;
    current: string;
    suggested: string;
  }>;
}): Promise<AnalysisRecord> {
  const inserted = (await db
    .insert(analysis)
    .values({
      userId: data.userId,
      jobId: data.jobId,
      resumeId: data.resumeId,
      overallScore: data.overallScore,
      breakdown: data.breakdown,
      gaps: data.gaps || [],
      recommendations: data.recommendations || [],
    })
    .returning()) as AnalysisRecord[];

  if (!inserted[0]) {
    throw new Error("Failed to create analysis");
  }

  return inserted[0];
}

export async function getAnalysisById(
  id: string
): Promise<AnalysisRecord | undefined> {
  const rows = (await db
    .select()
    .from(analysis)
    .where(eq(analysis.id, id))) as AnalysisRecord[];
  return rows[0];
}

export async function getAnalysesByUserId(
  userId: string
): Promise<AnalysisRecord[]> {
  return (await db
    .select()
    .from(analysis)
    .where(eq(analysis.userId, userId))) as AnalysisRecord[];
}
