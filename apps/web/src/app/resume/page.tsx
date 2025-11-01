"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ResumeDto } from "@/lib/api";
import { analysisApi } from "@/lib/api";

// Schema matching the resume analysis structure
const resumeAnalysisSchema = z.object({
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      field: z.string().nullable(),
      graduationDate: z.string().nullable(),
    })
  ),
});

export default function ResumePage() {
  const [resumeText, setResumeText] = useState("");
  const [useStreaming, setUseStreaming] = useState(true);
  const [finalResult, setFinalResult] = useState<ResumeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldUseStreaming, setShouldUseStreaming] = useState(true);

  const hasInput = resumeText.trim().length > 0;

  // Streaming analysis using useObject (defined early so clearStream is available)
  const {
    object: streamingObject,
    submit: submitStreaming,
    isLoading: isStreaming,
    error: streamingError,
    clear: clearStream,
  } = useObject({
    api: `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"}/analysis/resume/stream`,
    schema: resumeAnalysisSchema,
    onFinish: async (finalObject) => {
      console.log(
        "[Frontend] Streaming finished, final object param:",
        finalObject
      );
      console.log(
        "[Frontend] Streaming finished, streamingObject state:",
        streamingObject
      );
      // Store the final object (use parameter if provided, otherwise use state)
      const finalObj = finalObject || streamingObject;
      if (finalObj) {
        // Convert to ResumeDto format if needed
        setFinalResult(finalObj as unknown as ResumeDto);
      }
      // After streaming finishes, save to database using the regular API
      // Note: Save may fail if user is not authenticated, which is OK for now
      try {
        const saved = await analysisApi.analyzeResume({
          text: resumeText.trim(),
        });
        setFinalResult(saved);
        clearStream();
      } catch (err) {
        console.error(
          "Failed to save result (this is OK if user is not logged in):",
          err
        );
        // If save fails, keep the streamed result visible
      }
    },
    onError: (err) => {
      // If streaming fails, fall back to regular API
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
      const data = await analysisApi.analyzeResume({
        text: resumeText.trim(),
      });
      setFinalResult(data);
    } catch (err: unknown) {
      let errorMessage = "Erro ao analisar currículo";
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
      setError("Por favor, cole o texto do seu currículo");
      return;
    }

    setError(null);
    setFinalResult(null);
    clearStream();

    if (useStreaming && shouldUseStreaming) {
      // Try streaming first
      submitStreaming({
        text: resumeText.trim(),
      });
    } else {
      // Use regular API
      handleAnalyzeRegular();
    }
  };

  // Use streaming object if available, otherwise use final result
  const displayObject = streamingObject || null;
  const isLoading = isStreaming;

  // Debug: Log when streamingObject changes
  useEffect(() => {
    if (streamingObject) {
      console.log("[Frontend] streamingObject updated:", {
        hasSkills: !!streamingObject.skills,
        skillsCount: streamingObject.skills?.length || 0,
        hasExperience: !!streamingObject.experience,
        experienceCount: streamingObject.experience?.length || 0,
        hasEducation: !!streamingObject.education,
        educationCount: streamingObject.education?.length || 0,
        timestamp: new Date().toISOString(),
        fullObject: JSON.stringify(streamingObject, null, 2).slice(0, 200),
      });
    }
  }, [streamingObject]);

  // Debug: Log when streaming state changes
  useEffect(() => {
    console.log("[Frontend] Streaming state:", {
      isStreaming,
      hasStreamingObject: !!streamingObject,
      timestamp: new Date().toISOString(),
    });
  }, [isStreaming, streamingObject]);

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 font-bold text-3xl">Análise de Currículo</h1>

      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="resumeText">Texto do Currículo</Label>
            <textarea
              className="min-h-[300px] w-full rounded-md border p-3"
              disabled={isLoading}
              id="resumeText"
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Cole aqui o conteúdo completo do seu currículo..."
              value={resumeText}
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
            {isLoading ? "Analisando..." : "Analisar Currículo"}
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
            {displayObject.skills && displayObject.skills.length > 0 && (
              <div>
                <h3 className="font-semibold">Habilidades Detectadas:</h3>
                <ul className="list-inside list-disc">
                  {displayObject.skills
                    .filter((skill): skill is string => !!skill)
                    .map((skill: string) => (
                      <li key={skill}>{skill}</li>
                    ))}
                </ul>
              </div>
            )}

            {displayObject.experience &&
              displayObject.experience.length > 0 && (
                <div>
                  <h3 className="font-semibold">Experiência Profissional:</h3>
                  <div className="space-y-2">
                    {displayObject.experience
                      .filter((exp): exp is NonNullable<typeof exp> => !!exp)
                      .map((exp, idx) => (
                        <div className="rounded-md border p-3" key={idx}>
                          <p className="font-medium">{exp.title}</p>
                          <p className="text-muted-foreground text-sm">
                            {exp.company}
                          </p>
                          {exp.startDate && (
                            <p className="text-muted-foreground text-xs">
                              {exp.startDate}
                              {exp.endDate
                                ? ` - ${exp.endDate}`
                                : " - Presente"}
                            </p>
                          )}
                          {exp.description && (
                            <Streamdown className="mt-2 text-sm">
                              {exp.description}
                            </Streamdown>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {displayObject.education && displayObject.education.length > 0 && (
              <div>
                <h3 className="font-semibold">Formação:</h3>
                <div className="space-y-2">
                  {displayObject.education
                    .filter((edu): edu is NonNullable<typeof edu> => !!edu)
                    .map((edu, idx) => (
                      <div className="rounded-md border p-3" key={idx}>
                        <p className="font-medium">{edu.degree}</p>
                        <p className="text-muted-foreground text-sm">
                          {edu.institution}
                        </p>
                        {edu.field && (
                          <p className="text-muted-foreground text-xs">
                            {edu.field}
                          </p>
                        )}
                        {edu.graduationDate && (
                          <p className="text-muted-foreground text-xs">
                            {edu.graduationDate}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
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
            {finalResult.skills.length > 0 && (
              <div>
                <h3 className="font-semibold">Habilidades Detectadas:</h3>
                <ul className="list-inside list-disc">
                  {finalResult.skills.map((skill: string) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            )}

            {finalResult.experience.length > 0 && (
              <div>
                <h3 className="font-semibold">Experiência Profissional:</h3>
                <div className="space-y-2">
                  {finalResult.experience.map((exp, idx) => (
                    <div className="rounded-md border p-3" key={idx}>
                      <p className="font-medium">{exp.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {exp.company}
                      </p>
                      {exp.startDate && (
                        <p className="text-muted-foreground text-xs">
                          {exp.startDate}
                          {exp.endDate ? ` - ${exp.endDate}` : " - Presente"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalResult.education.length > 0 && (
              <div>
                <h3 className="font-semibold">Formação:</h3>
                <div className="space-y-2">
                  {finalResult.education.map((edu, idx) => (
                    <div className="rounded-md border p-3" key={idx}>
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-muted-foreground text-sm">
                        {edu.institution}
                      </p>
                      {edu.field && (
                        <p className="text-muted-foreground text-xs">
                          {edu.field}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalResult.skills.length === 0 &&
              finalResult.experience.length === 0 &&
              finalResult.education.length === 0 && (
                <p className="text-muted-foreground">
                  Nenhuma informação estruturada foi detectada no currículo.
                </p>
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
