import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import { todo } from "./schema/todo";

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
