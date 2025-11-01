"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JobDto } from "@/lib/api";
import { analysisApi } from "@/lib/api";

// Schema matching the job analysis structure
const jobAnalysisSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  keywords: z.array(
    z.object({
      word: z.string(),
      frequency: z.number(),
    })
  ),
  yearsOfExperience: z.number().nullable(),
  description: z.string(),
});

export default function AnalyzePage() {
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [useStreaming, setUseStreaming] = useState(true);
  const [finalResult, setFinalResult] = useState<JobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldUseStreaming, setShouldUseStreaming] = useState(true);

  const hasInput = jobText.trim().length > 0 || jobUrl.trim().length > 0;

  // Streaming analysis using useObject (defined early so clearStream is available)
  const {
    object: streamingObject,
    submit: submitStreaming,
    isLoading: isStreaming,
    error: streamingError,
    clear: clearStream,
  } = useObject({
    api: `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"}/analysis/job/stream`,
    schema: jobAnalysisSchema,
    onFinish: async () => {
      // After streaming finishes, save to database using the regular API
      try {
        const saved = await analysisApi.analyzeJob({
          url: jobUrl.trim() || undefined,
          text: jobText.trim() || undefined,
        });
        setFinalResult(saved);
        clearStream();
      } catch (err) {
        console.error("Failed to save result:", err);
      }
    },
    onError: (err) => {
      // If streaming fails (e.g., Groq doesn't support it), fall back to regular API
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response?.status === 404) {
          // Streaming not supported, fall back to regular API
          setShouldUseStreaming(false);
          void handleAnalyzeRegular();
        } else {
          setError(String(err));
        }
      } else {
        setError(String(err));
      }
    },
  });

  // Regular (non-streaming) analysis as fallback
  const handleAnalyzeRegular = async () => {
    setError(null);
    setFinalResult(null);
    clearStream();

    try {
      const data = await analysisApi.analyzeJob({
        url: jobUrl.trim() || undefined,
        text: jobText.trim() || undefined,
      });
      setFinalResult(data);
    } catch (err: unknown) {
      let errorMessage = "Erro ao analisar vaga";
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
      setError(errorMessage || null);
    }
  };

  const handleAnalyze = () => {
    if (!hasInput) {
      setError("Por favor, forneça uma URL ou texto da vaga");
      return;
    }

    setError(null);
    setFinalResult(null);
    clearStream();

    if (useStreaming && shouldUseStreaming) {
      // Try streaming first
      submitStreaming({
        url: jobUrl.trim() || undefined,
        text: jobText.trim() || undefined,
      });
    } else {
      // Use regular API
      handleAnalyzeRegular();
    }
  };

  // Use streaming object if available, otherwise use final result
  const displayObject = streamingObject || null;
  const isLoading = isStreaming;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 font-bold text-3xl">Análise de Descrição de Vaga</h1>

      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="jobUrl">URL da Vaga (opcional)</Label>
            <Input
              disabled={isLoading}
              id="jobUrl"
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://example.com/job-posting"
              type="url"
              value={jobUrl}
            />
          </div>

          <div className="text-center text-muted-foreground">ou</div>

          <div>
            <Label htmlFor="jobText">Texto da Descrição da Vaga</Label>
            <textarea
              className="min-h-[200px] w-full rounded-md border p-3"
              disabled={isLoading}
              id="jobText"
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Cole aqui a descrição completa da vaga..."
              value={jobText}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              checked={useStreaming}
              className="h-4 w-4"
              id="useStreaming"
              onChange={(e) => setUseStreaming(e.target.checked)}
              type="checkbox"
            />
            <Label className="cursor-pointer" htmlFor="useStreaming">
              Usar streaming (resultado aparece em tempo real)
            </Label>
          </div>

          <Button
            className="w-full"
            disabled={isLoading || !hasInput}
            onClick={handleAnalyze}
          >
            {isLoading ? "Analisando..." : "Analisar Vaga"}
          </Button>
        </div>
      </Card>

      {(error || streamingError) && (
        <Card className="mb-6 border-destructive bg-destructive/10 p-6">
          <p className="text-destructive">{error || String(streamingError)}</p>
        </Card>
      )}

      {/* Display streaming results in real-time */}
      {displayObject && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 font-bold text-2xl">
            {isLoading ? "Analisando..." : "Resultado da Análise"}
          </h2>

          <div className="space-y-4">
            {displayObject.title && (
              <div>
                <h3 className="font-semibold">Título:</h3>
                <p>{displayObject.title}</p>
              </div>
            )}

            {displayObject.company && (
              <div>
                <h3 className="font-semibold">Empresa:</h3>
                <p>{String(displayObject.company)}</p>
              </div>
            )}

            {displayObject.requiredSkills &&
              displayObject.requiredSkills.length > 0 && (
                <div>
                  <h3 className="font-semibold">Habilidades Requeridas:</h3>
                  <ul className="list-inside list-disc">
                    {displayObject.requiredSkills
                      .filter((skill): skill is string => !!skill)
                      .map((skill: string) => (
                        <li key={skill}>{skill}</li>
                      ))}
                  </ul>
                </div>
              )}

            {displayObject.preferredSkills &&
              displayObject.preferredSkills.length > 0 && (
                <div>
                  <h3 className="font-semibold">Habilidades Preferenciais:</h3>
                  <ul className="list-inside list-disc">
                    {displayObject.preferredSkills
                      .filter((skill): skill is string => !!skill)
                      .map((skill: string) => (
                        <li key={skill}>{skill}</li>
                      ))}
                  </ul>
                </div>
              )}

            {displayObject.keywords && displayObject.keywords.length > 0 && (
              <div>
                <h3 className="font-semibold">Palavras-chave (Top 10):</h3>
                <ul className="list-inside list-disc">
                  {displayObject.keywords
                    .slice(0, 10)
                    .filter(
                      (kw): kw is { word: string; frequency: number } => !!kw
                    )
                    .map((kw) => (
                      <li key={`${kw.word}-${kw.frequency}`}>
                        {kw.word} ({kw.frequency}x)
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {displayObject.description && (
              <div>
                <h3 className="font-semibold">Descrição:</h3>
                <Streamdown>{displayObject.description}</Streamdown>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Display final saved result */}
      {finalResult && !displayObject && (
        <Card className="p-6">
          <h2 className="mb-4 font-bold text-2xl">Resultado da Análise</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Título:</h3>
              <p>{finalResult.title}</p>
            </div>

            {finalResult.company && (
              <div>
                <h3 className="font-semibold">Empresa:</h3>
                <p>{String(finalResult.company)}</p>
              </div>
            )}

            {finalResult.url && (
              <div>
                <h3 className="font-semibold">URL:</h3>
                <a
                  className="text-blue-500 hover:underline"
                  href={String(finalResult.url)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {String(finalResult.url)}
                </a>
              </div>
            )}

            {finalResult.requiredSkills.length > 0 && (
              <div>
                <h3 className="font-semibold">Habilidades Requeridas:</h3>
                <ul className="list-inside list-disc">
                  {finalResult.requiredSkills.map((skill: string) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            )}

            {finalResult.preferredSkills.length > 0 && (
              <div>
                <h3 className="font-semibold">Habilidades Preferenciais:</h3>
                <ul className="list-inside list-disc">
                  {finalResult.preferredSkills.map((skill: string) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            )}

            {finalResult.keywords.length > 0 && (
              <div>
                <h3 className="font-semibold">Palavras-chave (Top 10):</h3>
                <ul className="list-inside list-disc">
                  {finalResult.keywords.slice(0, 10).map((kw) => (
                    <li key={`${kw.word}-${kw.frequency}`}>
                      {kw.word} ({kw.frequency}x)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm">
                ID: {finalResult.id}
                {finalResult.createdAt && (
                  <>
                    {" "}
                    | Criado em:{" "}
                    {new Date(String(finalResult.createdAt)).toLocaleString()}
                  </>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
