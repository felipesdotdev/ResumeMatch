"use client";
import type {
  AnalysisControllerAnalyzeCompatibilityResult,
  AnalysisControllerAnalyzeJobResult,
  AnalysisControllerAnalyzeResumeResult,
  AnalysisControllerGetAnalysisResult,
  AnalysisControllerGetJobResult,
  AnalysisControllerGetResumeResult,
  AnalysisDto,
  CreateAnalysisDto,
  JobDto,
  ResumeDto,
  TodoDto,
  TodosControllerCreateResult,
  TodosControllerFindAllResult,
  TodosControllerUpdateResult,
} from "@resumematch/api-client";
import { getResumeMatchAPI } from "@resumematch/api-client";
import axios from "axios";

export type {
  AnalysisDto,
  CreateAnalysisDto,
  JobDto,
  ResumeDto,
  TodoDto as Todo,
} from "@resumematch/api-client";

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

export const analysisApi = {
  async analyzeJob(data: { url?: string; text?: string }): Promise<JobDto> {
    const res =
      await api.analysisControllerAnalyzeJob<AnalysisControllerAnalyzeJobResult>(
        data
      );
    return res.data;
  },
  async getJob(id: string): Promise<JobDto> {
    const res =
      await api.analysisControllerGetJob<AnalysisControllerGetJobResult>(id);
    return res.data;
  },
  async analyzeResume(data: { text: string }): Promise<ResumeDto> {
    const res =
      await api.analysisControllerAnalyzeResume<AnalysisControllerAnalyzeResumeResult>(
        data
      );
    return res.data;
  },
  async getResume(id: string): Promise<ResumeDto> {
    const res =
      await api.analysisControllerGetResume<AnalysisControllerGetResumeResult>(
        id
      );
    return res.data;
  },
  async analyzeCompatibility(data: CreateAnalysisDto): Promise<AnalysisDto> {
    const res =
      await api.analysisControllerAnalyzeCompatibility<AnalysisControllerAnalyzeCompatibilityResult>(
        data
      );
    return res.data;
  },
  async getAnalysis(id: string): Promise<AnalysisDto> {
    const res =
      await api.analysisControllerGetAnalysis<AnalysisControllerGetAnalysisResult>(
        id
      );
    return res.data;
  },
};
