"use client";

import type { AnalysisDto, JobDto, ResumeDto } from "@resumematch/api-client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { analysisApi } from "@/lib/api";

export default function ComparePage() {
  const [resumeId, setResumeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisDto | null>(null);
  const [resume, setResume] = useState<ResumeDto | null>(null);
  const [job, setJob] = useState<JobDto | null>(null);

  const hasInput = resumeId.trim().length > 0 && jobId.trim().length > 0;

  const handleAnalyze = async () => {
    if (!hasInput) {
      setError("Por favor, forneça os IDs do currículo e da vaga");
      return;
    }

    setError(null);
    setAnalysis(null);
    setIsLoading(true);

    try {
      // Fetch resume and job for display
      const [resumeData, jobData] = await Promise.all([
        analysisApi.getResume(resumeId.trim()),
        analysisApi.getJob(jobId.trim()),
      ]);

      setResume(resumeData);
      setJob(jobData);

      // Analyze compatibility
      const analysisData = await analysisApi.analyzeCompatibility({
        resumeId: resumeId.trim(),
        jobId: jobId.trim(),
      });

      setAnalysis(analysisData);
    } catch (err: unknown) {
      let errorMessage = "Erro ao analisar compatibilidade";
      if (err && typeof err === "object") {
        if ("response" in err) {
          const response = (
            err as { response?: { data?: { message?: string } } }
          ).response;
          errorMessage = response?.data?.message || errorMessage;
        } else if ("message" in err) {
          errorMessage = String((err as { message: unknown }).message);
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getImportanceColor = (
    importance: "high" | "medium" | "low"
  ): string => {
    switch (importance) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <h1 className="mb-6 font-bold text-3xl">Análise de Compatibilidade</h1>
      <p className="mb-6 text-muted-foreground">
        Compare seu currículo com uma vaga de emprego e obtenha um score de
        compatibilidade, análise de gaps e recomendações.
      </p>

      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="resumeId">ID do Currículo</Label>
            <Input
              disabled={isLoading}
              id="resumeId"
              onChange={(e) => setResumeId(e.target.value)}
              placeholder="Cole o ID do currículo analisado..."
              type="text"
              value={resumeId}
            />
            <p className="mt-1 text-muted-foreground text-sm">
              Você pode obter este ID na página de análise de currículo
            </p>
          </div>

          <div>
            <Label htmlFor="jobId">ID da Vaga</Label>
            <Input
              disabled={isLoading}
              id="jobId"
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Cole o ID da vaga analisada..."
              type="text"
              value={jobId}
            />
            <p className="mt-1 text-muted-foreground text-sm">
              Você pode obter este ID na página de análise de vaga
            </p>
          </div>

          <Button
            className="w-full"
            disabled={isLoading || !hasInput}
            onClick={handleAnalyze}
          >
            {isLoading ? "Analisando..." : "Analisar Compatibilidade"}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10 p-6">
          <p className="text-destructive">{error}</p>
        </Card>
      )}

      {analysis && (
        <>
          {/* Overall Score */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-bold text-2xl">
              Score Geral de Compatibilidade
            </h2>
            <div className="flex items-center gap-4">
              <div
                className={`font-bold text-6xl ${getScoreColor(analysis.overallScore)}`}
              >
                {analysis.overallScore}%
              </div>
              <div className="flex-1">
                <Progress className="h-4" value={analysis.overallScore} />
                <p className="mt-2 text-muted-foreground text-sm">
                  {analysis.overallScore >= 80
                    ? "Excelente compatibilidade! Você atende bem aos requisitos."
                    : analysis.overallScore >= 60
                      ? "Boa compatibilidade, mas há espaço para melhorias."
                      : "Baixa compatibilidade. Considere as recomendações abaixo."}
                </p>
              </div>
            </div>
          </Card>

          {/* Breakdown */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-bold text-2xl">Análise Detalhada</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Habilidades (40%)</span>
                  <span
                    className={getScoreColor(analysis.breakdown.skills.score)}
                  >
                    {analysis.breakdown.skills.score}%
                  </span>
                </div>
                <Progress value={analysis.breakdown.skills.score} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Experiência (30%)</span>
                  <span
                    className={getScoreColor(
                      analysis.breakdown.experience.score
                    )}
                  >
                    {analysis.breakdown.experience.score}%
                  </span>
                </div>
                <Progress value={analysis.breakdown.experience.score} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Palavras-chave (20%)</span>
                  <span
                    className={getScoreColor(analysis.breakdown.keywords.score)}
                  >
                    {analysis.breakdown.keywords.score}%
                  </span>
                </div>
                <Progress value={analysis.breakdown.keywords.score} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Educação (10%)</span>
                  <span
                    className={getScoreColor(
                      analysis.breakdown.education.score
                    )}
                  >
                    {analysis.breakdown.education.score}%
                  </span>
                </div>
                <Progress value={analysis.breakdown.education.score} />
              </div>
            </div>
          </Card>

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <Card className="mb-6 p-6">
              <h2 className="mb-4 font-bold text-2xl">Gaps Identificados</h2>
              <div className="space-y-3">
                {analysis.gaps.map((gap, index) => (
                  <div
                    className="flex items-start justify-between rounded-lg border p-3"
                    key={index}
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={getImportanceColor(gap.importance)}>
                          {gap.type}
                        </Badge>
                        <Badge variant="outline">{gap.importance}</Badge>
                      </div>
                      <p className="font-semibold">{gap.missing}</p>
                      {gap.frequency !== undefined && (
                        <p className="text-muted-foreground text-sm">
                          Frequência na vaga: {gap.frequency}x
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <Card className="mb-6 p-6">
              <h2 className="mb-4 font-bold text-2xl">Recomendações</h2>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div className="rounded-lg border p-4" key={index}>
                    <div className="mb-2">
                      <Badge variant="outline">{rec.section}</Badge>
                    </div>
                    <div className="mb-2">
                      <p className="font-semibold">Situação Atual:</p>
                      <p className="text-muted-foreground">{rec.current}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Recomendação:</p>
                      <p className="text-muted-foreground">{rec.suggested}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Resume and Job Info */}
          {(resume || job) && (
            <div className="grid gap-6 md:grid-cols-2">
              {resume && (
                <Card className="p-6">
                  <h3 className="mb-3 font-semibold">Currículo Analisado</h3>
                  <p className="text-muted-foreground text-sm">
                    ID: {resume.id}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Skills: {resume.skills.length} habilidades identificadas
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Experiências: {resume.experience.length}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Formação: {resume.education.length}
                  </p>
                </Card>
              )}

              {job && (
                <Card className="p-6">
                  <h3 className="mb-3 font-semibold">Vaga Analisada</h3>
                  <p className="font-semibold">{job.title}</p>
                  {job.company && (
                    <p className="text-muted-foreground text-sm">
                      {String(job.company)}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">ID: {job.id}</p>
                  <p className="text-muted-foreground text-sm">
                    Skills requeridas: {job.requiredSkills.length}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Skills preferidas: {job.preferredSkills.length}
                  </p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
