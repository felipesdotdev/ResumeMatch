import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, streamObject } from "ai";
import { z } from "zod";

/**
 * AI Service for analyzing job descriptions and resumes
 * Uses Vercel AI SDK with support for multiple providers
 * Priority: Anthropic Claude > Groq > OpenAI
 */
const MAX_DEBUG_TEXT_LENGTH = 500;
const MARKDOWN_JSON_REGEX = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;

export class AIService {
  private providerType: "anthropic" | "groq" | "openai" | null = null;

  private getModel() {
    // Priority order: Anthropic > OpenAI > Groq
    // Anthropic: Best for structured extraction and accuracy, supports streaming
    // OpenAI: Excellent structured outputs with streaming support
    // Groq: Fast and cost-effective, but doesn't support streaming with JSON structured outputs
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    console.log("[AIService] Checking AI providers:", {
      hasAnthropic: !!anthropicKey,
      hasOpenAI: !!openaiKey,
      hasGroq: !!groqKey,
    });

    if (anthropicKey) {
      this.providerType = "anthropic";
      console.log("[AIService] Using Anthropic Claude");
      return anthropic("claude-3-5-sonnet-20241022");
    }
    if (openaiKey) {
      this.providerType = "openai";
      console.log("[AIService] Using OpenAI GPT-4o");
      return openai("gpt-4.1-nano");
    }
    if (groqKey) {
      this.providerType = "groq";
      console.log("[AIService] Using Groq (OpenAI GPT OSS 20B)");
      // Using openai/gpt-oss-20b - supports structured outputs (json_schema) and browser search
      // Note: Groq doesn't support streaming with structured JSON outputs
      return groq("openai/gpt-oss-20b");
    }
    throw new Error(
      "No AI provider configured. Set ANTHROPIC_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in your environment variables."
    );
  }

  /**
   * Helper method to parse JSON from Groq text response
   */
  private parseGroqJsonResponse(text: string): unknown {
    let jsonText = text.trim();

    // Remove markdown code blocks
    const markdownMatch = jsonText.match(MARKDOWN_JSON_REGEX);
    if (markdownMatch?.[1]) {
      jsonText = markdownMatch[1].trim();
    }

    // Remove any leading/trailing non-JSON text
    const jsonStart = jsonText.indexOf("{");
    const jsonEnd = jsonText.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(jsonText);
  }

  /**
   * Helper method to generate a JSON structure example from Zod schema
   * Used to guide Groq models to use correct field names
   */
  private getJsonStructureExample(schema: z.ZodObject<any>): string {
    const shape = schema.shape;
    const example: Record<string, unknown> = {};

    for (const [key] of Object.entries(shape)) {
      // Use placeholder - the model will fill in correct types
      example[key] = null;
    }

    return JSON.stringify(example, null, 2);
  }

  /**
   * Parses date range string like "2020 - Presente" or "2018 - 2020" into startDate and endDate
   */
  private parseDateRange(dates: string): {
    startDate: string | null;
    endDate: string | null;
  } {
    if (!dates || typeof dates !== "string") {
      return { startDate: null, endDate: null };
    }

    // Handle "Presente", "Present", "Atual", "Current"
    const currentKeywords = /presente|present|atual|current/i;
    const isCurrent = currentKeywords.test(dates);

    // Extract dates - format: "YYYY - YYYY" or "YYYY - Presente"
    const match = dates.match(
      /(\d{4})\s*-\s*(\d{4}|presente|present|atual|current)/i
    );
    if (match) {
      return {
        startDate: match[1] ?? null,
        endDate: isCurrent ? null : (match[2] ?? null),
      };
    }

    // Try single year
    const yearMatch = dates.match(/(\d{4})/);
    if (yearMatch && yearMatch[1]) {
      return {
        startDate: yearMatch[1],
        endDate: isCurrent ? null : yearMatch[1],
      };
    }

    return { startDate: null, endDate: null };
  }

  /**
   * Normalizes Groq response by converting nulls/objects to appropriate default values
   * Uses safe parsing to determine expected types
   */
  private normalizeGroqResponse(
    data: Record<string, unknown>,
    schema: z.ZodObject<any>
  ): Record<string, unknown> {
    const normalized = { ...data };
    const shape = schema.shape;

    for (const [key] of Object.entries(shape)) {
      const currentValue = normalized[key];

      // Handle null or undefined
      if (currentValue === null || currentValue === undefined) {
        // Try to parse with schema to see what type is expected
        // If it fails for null, we know it's not nullable
        const testObj = { ...normalized, [key]: null };
        const parseResult = schema.safeParse(testObj);

        if (!parseResult.success) {
          // Field doesn't accept null, need to provide default
          // Try with empty string first
          const testString = { ...normalized, [key]: "" };
          if (schema.safeParse(testString).success) {
            normalized[key] = "";
          } else {
            // Try with empty array
            const testArray = { ...normalized, [key]: [] };
            if (schema.safeParse(testArray).success) {
              normalized[key] = [];
            } else {
              // Try with 0
              const testNumber = { ...normalized, [key]: 0 };
              if (schema.safeParse(testNumber).success) {
                normalized[key] = 0;
              }
              // If none work, leave as null (shouldn't happen)
            }
          }
        }
        // If parse succeeds with null, field is nullable, keep null
      }
      // Handle object when array is expected (e.g., {} instead of [])
      else if (
        typeof currentValue === "object" &&
        currentValue !== null &&
        !Array.isArray(currentValue)
      ) {
        // Check if schema expects an array
        const testArray = { ...normalized, [key]: [] };
        if (schema.safeParse(testArray).success) {
          // Empty object means no items, convert to empty array
          normalized[key] = [];
        }
        // If object is expected, leave it as is
      }
      // Handle array of strings when array of objects is expected (e.g., ["React"] instead of [{word: "React", frequency: 1}])
      else if (Array.isArray(currentValue) && currentValue.length > 0) {
        const firstElement = currentValue[0];

        if (typeof firstElement === "string") {
          // Check if schema expects array of objects
          const testArrayOfObjects = {
            ...normalized,
            [key]: [{ word: "test", frequency: 1 }],
          };
          if (schema.safeParse(testArrayOfObjects).success) {
            // Convert array of strings to array of objects
            normalized[key] = (currentValue as string[]).map((word) => ({
              word,
              frequency: 1,
            }));
          }
        } else if (
          typeof firstElement === "object" &&
          firstElement !== null &&
          !Array.isArray(firstElement)
        ) {
          // Normalize array of objects - handle special cases like "dates" field
          normalized[key] = (currentValue as unknown[]).map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              !Array.isArray(item)
            ) {
              const itemObj = item as Record<string, unknown>;
              const normalizedItem = { ...itemObj };

              // Handle dates field conversion for experience
              if ("dates" in itemObj && typeof itemObj.dates === "string") {
                const { startDate, endDate } = this.parseDateRange(
                  itemObj.dates
                );
                normalizedItem.startDate = startDate ?? null;
                normalizedItem.endDate = endDate ?? null;
                delete normalizedItem.dates;
              }

              // Ensure required string fields have values (not undefined)
              // Test by creating a copy with empty string for undefined fields
              for (const fieldKey of Object.keys(normalizedItem)) {
                if (normalizedItem[fieldKey] === undefined) {
                  // Try setting to empty string - will be validated by Zod
                  normalizedItem[fieldKey] = "";
                }
              }

              return normalizedItem;
            }
            return item;
          });
        }
      }
    }

    return normalized;
  }

  /**
   * Helper method to generate structured objects
   * Uses generateObject for all providers - Groq supports json_schema with structuredOutputs: true (default)
   * Falls back to generateText with json_object for older Groq models if needed
   */
  private async generateStructuredObject<T extends z.ZodType>(
    schema: T,
    prompt: string
  ): Promise<z.infer<T>> {
    const model = this.getModel();

    // Try generateObject first for all providers
    // openai/gpt-oss-20b supports json_schema structured outputs (default)
    try {
      const { object } = await generateObject({
        model,
        schema,
        prompt,
        // openai/gpt-oss-20b supports structuredOutputs: true (default)
        // This enables json_schema format for better structured extraction
        providerOptions:
          this.providerType === "groq"
            ? {
                groq: {
                  structuredOutputs: true, // Enable json_schema for openai/gpt-oss-20b
                },
              }
            : undefined,
      });
      return object as z.infer<T>;
    } catch (error) {
      // Fallback for Groq models that don't support structuredOutputs
      if (this.providerType === "groq") {
        console.warn(
          "[AIService] generateObject failed with Groq, falling back to json_object mode",
          error
        );
        // Generate structure example to guide the model
        let structureExample = "";
        try {
          if (schema instanceof z.ZodObject) {
            structureExample = this.getJsonStructureExample(schema);
          }
        } catch {
          // If we can't generate example, continue without it
        }

        const structureGuidance = structureExample
          ? `\n\nUse EXACTLY these field names in your JSON response:\n${structureExample}\n\n`
          : "";

        const { text } = await generateText({
          model,
          prompt: `${prompt}${structureGuidance}

CRITICAL REQUIREMENTS:
1. You MUST respond with valid JSON only using the EXACT field names specified above. Do NOT use snake_case, use camelCase as shown.
2. For required fields (non-nullable):
   - Strings: Use empty string "" if no value, NEVER use null
   - Arrays: Use empty array [] if no items, NEVER use null or empty object {}
   - Numbers: Use 0 if no value, NEVER use null
3. Only use null for fields explicitly marked as nullable (like "company" or "yearsOfExperience")
4. IMPORTANT: Arrays must be arrays [], not objects {}. For example, "keywords" should be [] not {}
5. Do NOT include any markdown code blocks, comments, explanations, or additional text outside the JSON.
6. Respond with ONLY the raw JSON object, nothing else.

IMPORTANT: You must respond with valid JSON format only.`,
          // Note: When structuredOutputs is false, we don't need responseFormat
          // The AI SDK handles it automatically. We just need "JSON" in the prompt.
          providerOptions: {
            groq: {
              structuredOutputs: false,
            },
          },
        });

        try {
          const parsed = this.parseGroqJsonResponse(text);

          // Normalize response - convert nulls to defaults for required fields
          let normalized = parsed;
          if (
            schema instanceof z.ZodObject &&
            typeof parsed === "object" &&
            parsed !== null
          ) {
            normalized = this.normalizeGroqResponse(
              parsed as Record<string, unknown>,
              schema
            );
          }

          // Validate with Zod schema
          return schema.parse(normalized) as z.infer<T>;
        } catch (error) {
          console.error("[AIService] Failed to parse Groq JSON response:", {
            error: error instanceof Error ? error.message : String(error),
            rawText: text.substring(0, MAX_DEBUG_TEXT_LENGTH),
          });
          throw new Error(
            `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // If error was not from Groq fallback, re-throw it
      throw error;
    }
  }

  /**
   * Streams job description analysis - returns a stream of partial objects
   * Works with Anthropic, OpenAI, and Groq (openai/gpt-oss-20b supports json_schema structured outputs)
   */
  streamJobDescription(jobText: string) {
    const jobAnalysisSchema = z.object({
      title: z.string().describe("Job title or position name"),
      company: z
        .string()
        .nullable()
        .describe("Company name if mentioned, otherwise null"),
      requiredSkills: z
        .array(z.string())
        .describe("List of required technical skills and qualifications"),
      preferredSkills: z
        .array(z.string())
        .describe("List of preferred or nice-to-have skills"),
      keywords: z
        .array(
          z.object({
            word: z.string(),
            frequency: z.number(),
          })
        )
        .describe(
          "Important keywords extracted from the job description with their frequency"
        ),
      yearsOfExperience: z
        .number()
        .nullable()
        .describe("Required years of experience if specified, otherwise null"),
      description: z
        .string()
        .describe("A cleaned and formatted version of the job description"),
    });

    const model = this.getModel();
    const prompt = `Analyze the following job description and extract structured information. 
      
Job Description:
${jobText}

Extract:
- Job title (be specific, e.g., "Senior Full Stack Developer" not just "Developer")
- Company name if mentioned
- Required skills (must-have technical skills, frameworks, tools)
- Preferred skills (nice-to-have, bonus skills)
- Important keywords with frequency: For each keyword, provide an object with "word" (the keyword) and "frequency" (number of times it appears). Format: [{"word": "React", "frequency": 3}, ...]
- Years of experience required if mentioned
- Clean description (remove noise, keep essential information)

Be precise and extract only information that is clearly stated in the job description.`;

    // Use streamObject for all providers
    // OpenAI and Anthropic support streaming with structured outputs natively
    // Groq doesn't support streaming with structured outputs, so we disable it
    const streamingPrompt =
      this.providerType === "groq"
        ? `${prompt}

IMPORTANT: You must respond with valid JSON format only.`
        : prompt;

    return streamObject({
      model,
      schema: jobAnalysisSchema,
      prompt: streamingPrompt,
      // OpenAI and Anthropic support streaming with structured outputs natively
      // Groq doesn't support streaming with structured outputs, so we disable it
      providerOptions:
        this.providerType === "groq"
          ? {
              groq: {
                structuredOutputs: false, // Groq doesn't support streaming with structured outputs
              },
            }
          : undefined,
    });
  }

  /**
   * Streams resume analysis - returns a stream of partial objects
   * Works with Anthropic, OpenAI, and Groq (openai/gpt-oss-20b supports json_schema structured outputs)
   */
  streamResumeText(resumeText: string) {
    const resumeAnalysisSchema = z.object({
      skills: z
        .array(z.string())
        .describe("Technical skills, programming languages, tools, frameworks"),
      experience: z
        .array(
          z.object({
            title: z.string().describe("Job title or position"),
            company: z.string().describe("Company name"),
            startDate: z
              .string()
              .nullable()
              .describe("Start date (MM/YYYY or YYYY format)"),
            endDate: z
              .string()
              .nullable()
              .describe(
                "End date (MM/YYYY, YYYY, or null if current position)"
              ),
            description: z
              .string()
              .nullable()
              .describe("Job description or key responsibilities"),
          })
        )
        .describe("Professional experience entries"),
      education: z
        .array(
          z.object({
            degree: z
              .string()
              .describe("Degree name (e.g., Bachelor of Science)"),
            institution: z.string().describe("University or institution name"),
            field: z
              .string()
              .nullable()
              .describe("Field of study if mentioned"),
            graduationDate: z
              .string()
              .nullable()
              .describe("Graduation date (MM/YYYY or YYYY format)"),
          })
        )
        .describe("Education entries"),
    });

    const model = this.getModel();
    const prompt = `Analyze the following resume text and extract structured information.

Resume Text:
${resumeText}

Extract:
- Skills: All technical skills, programming languages, frameworks, tools mentioned (as array of strings)
- Experience: For each job position, extract:
  * title (required, string)
  * company (required, string)
  * startDate (nullable, string in MM/YYYY or YYYY format, or null if current position)
  * endDate (nullable, string in MM/YYYY or YYYY format, or null if current position)
  * description (nullable, string)
  IMPORTANT: Use "startDate" and "endDate" fields separately, NOT a single "dates" field
- Education: For each degree, extract:
  * degree (required, string - e.g., "Bachelor of Science")
  * institution (required, string)
  * field (nullable, string - field of study)
  * graduationDate (nullable, string in MM/YYYY or YYYY format)

Be thorough and extract all relevant information. All required fields must be present with valid values (strings or null for nullable fields).`;

    // Use streamObject for all providers
    // OpenAI and Anthropic support streaming with structured outputs natively
    // Groq doesn't support streaming with structured outputs, so we disable it
    const streamingPrompt =
      this.providerType === "groq"
        ? `${prompt}

IMPORTANT: You must respond with valid JSON format only.`
        : prompt;

    return streamObject({
      model,
      schema: resumeAnalysisSchema,
      prompt: streamingPrompt,
      // OpenAI and Anthropic support streaming with structured outputs natively
      // Groq doesn't support streaming with structured outputs, so we disable it
      providerOptions:
        this.providerType === "groq"
          ? {
              groq: {
                structuredOutputs: false, // Groq doesn't support streaming with structured outputs
              },
            }
          : undefined,
    });
  }

  /**
   * Analyzes a job description and extracts structured information
   */
  async analyzeJobDescription(jobText: string) {
    const jobAnalysisSchema = z.object({
      title: z.string().describe("Job title or position name"),
      company: z
        .string()
        .nullable()
        .describe("Company name if mentioned, otherwise null"),
      requiredSkills: z
        .array(z.string())
        .describe("List of required technical skills and qualifications"),
      preferredSkills: z
        .array(z.string())
        .describe("List of preferred or nice-to-have skills"),
      keywords: z
        .array(
          z.object({
            word: z.string(),
            frequency: z.number(),
          })
        )
        .describe(
          "Important keywords extracted from the job description with their frequency"
        ),
      yearsOfExperience: z
        .number()
        .nullable()
        .describe("Required years of experience if specified, otherwise null"),
      description: z
        .string()
        .describe("A cleaned and formatted version of the job description"),
    });

    return await this.generateStructuredObject(
      jobAnalysisSchema,
      `Analyze the following job description and extract structured information. 
      
Job Description:
${jobText}

Extract:
- Job title (be specific, e.g., "Senior Full Stack Developer" not just "Developer")
- Company name if mentioned
- Required skills (must-have technical skills, frameworks, tools)
- Preferred skills (nice-to-have, bonus skills)
- Important keywords with frequency: For each keyword, provide an object with "word" (the keyword) and "frequency" (number of times it appears). Format: [{"word": "React", "frequency": 3}, ...]
- Years of experience required if mentioned
- Clean description (remove noise, keep essential information)

Be precise and extract only information that is clearly stated in the job description.`
    );
  }

  /**
   * Analyzes a resume and extracts structured information
   */
  async analyzeResumeText(resumeText: string) {
    const resumeAnalysisSchema = z.object({
      skills: z
        .array(z.string())
        .describe("Technical skills, programming languages, tools, frameworks"),
      experience: z
        .array(
          z.object({
            title: z.string().describe("Job title or position"),
            company: z.string().describe("Company name"),
            startDate: z
              .string()
              .nullable()
              .describe("Start date (MM/YYYY or YYYY format)"),
            endDate: z
              .string()
              .nullable()
              .describe(
                "End date (MM/YYYY, YYYY, or null if current position)"
              ),
            description: z
              .string()
              .nullable()
              .describe("Job description or key responsibilities"),
          })
        )
        .describe("Professional experience entries"),
      education: z
        .array(
          z.object({
            degree: z
              .string()
              .describe("Degree name (e.g., Bachelor of Science)"),
            institution: z.string().describe("University or institution name"),
            field: z
              .string()
              .nullable()
              .describe("Field of study if mentioned"),
            graduationDate: z
              .string()
              .nullable()
              .describe("Graduation date (MM/YYYY or YYYY format)"),
          })
        )
        .describe("Education entries"),
    });

    return await this.generateStructuredObject(
      resumeAnalysisSchema,
      `Analyze the following resume text and extract structured information.

Resume Text:
${resumeText}

Extract:
- Skills: All technical skills, programming languages, frameworks, tools mentioned (as array of strings)
- Experience: For each job position, extract:
  * title (required, string)
  * company (required, string)
  * startDate (nullable, string in MM/YYYY or YYYY format, or null if current position)
  * endDate (nullable, string in MM/YYYY or YYYY format, or null if current position)
  * description (nullable, string)
  IMPORTANT: Use "startDate" and "endDate" fields separately, NOT a single "dates" field
- Education: For each degree, extract:
  * degree (required, string - e.g., "Bachelor of Science")
  * institution (required, string)
  * field (nullable, string - field of study)
  * graduationDate (nullable, string in MM/YYYY or YYYY format)

Be thorough and extract all relevant information. All required fields must be present with valid values (strings or null for nullable fields).`
    );
  }
}
