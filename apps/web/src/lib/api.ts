"use client";
import type {
  TodoDto,
  TodosControllerCreateResult,
  TodosControllerFindAllResult,
  TodosControllerUpdateResult,
} from "@resumematch/api-client";
import { getResumeMatchAPI } from "@resumematch/api-client";
import axios from "axios";

export type { TodoDto as Todo } from "@resumematch/api-client";

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

export const api = getResumeMatchAPI();

export const todosApi = {
  async list(): Promise<TodoDto[]> {
    const res =
      await api.todosControllerFindAll<TodosControllerFindAllResult>();
    return res.data;
  },
  async create(data: { title: string }): Promise<TodoDto> {
    const res =
      await api.todosControllerCreate<TodosControllerCreateResult>(data);
    return res.data;
  },
  async update(
    id: number,
    data: { title?: string; completed?: boolean }
  ): Promise<TodoDto> {
    const res = await api.todosControllerUpdate<TodosControllerUpdateResult>(
      String(id),
      data
    );
    return res.data;
  },
  async remove(id: number): Promise<void> {
    await api.todosControllerRemove(String(id));
  },
};
