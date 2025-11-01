import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { auth } from "@resumematch/auth";

// FastifyReply type is available from @nestjs/platform-fastify but we'll use any for compatibility
type FastifyReply = any;

import type { AnalysisService } from "./analysis.service.js";
import { AnalysisDto } from "./dto/analysis.dto.js";
import type { AnalyzeJobDto } from "./dto/analyze-job.dto.js";
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";
import type { CreateResumeDto } from "./dto/create-resume.dto.js";
import { JobDto } from "./dto/job.dto.js";
import { ResumeDto } from "./dto/resume.dto.js";

@ApiTags("analysis")
@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  private async getUserId(request: any): Promise<string> {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers || {})) {
      if (value) {
        headers.append(key, String(value));
      }
    }

    const session = await auth.api.getSession({ headers });
    if (!session?.user?.id) {
      throw new HttpException(
        "Unauthorized - You must be logged in to analyze jobs",
        HttpStatus.UNAUTHORIZED
      );
    }

    return session.user.id;
  }

  @Post("job")
  @ApiCreatedResponse({
    type: JobDto,
    description: "Analyze a job description and extract key information",
  })
  async analyzeJob(
    @Body() dto: AnalyzeJobDto,
    @Request() req: any
  ): Promise<JobDto> {
    const userId = await this.getUserId(req);

    const job = await this.analysisService.analyzeJob({
      url: dto.url,
      text: dto.text,
      userId,
    });

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.url,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      keywords: job.keywords,
      userId: job.userId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  @Get("job/:id")
  @ApiOkResponse({ type: JobDto, description: "Get job by ID" })
  async getJob(@Param("id") id: string): Promise<JobDto | undefined> {
    const job = await this.analysisService.getJob(id);

    if (!job) {
      return;
    }

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.url,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      keywords: job.keywords,
      userId: job.userId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  @Post("resume")
  @ApiCreatedResponse({
    type: ResumeDto,
    description: "Analyze and parse a resume",
  })
  async analyzeResume(
    @Body() dto: CreateResumeDto,
    @Request() req: any
  ): Promise<ResumeDto> {
    const userId = await this.getUserId(req);

    const resume = await this.analysisService.analyzeResume({
      text: dto.text,
      userId,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
    });

    return {
      id: resume.id,
      userId: resume.userId,
      fileUrl: resume.fileUrl,
      fileName: resume.fileName,
      fileSize: resume.fileSize,
      text: resume.text,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  @Get("resume/:id")
  @ApiOkResponse({ type: ResumeDto, description: "Get resume by ID" })
  async getResume(@Param("id") id: string): Promise<ResumeDto | undefined> {
    const resume = await this.analysisService.getResume(id);

    if (!resume) {
      return;
    }

    return {
      id: resume.id,
      userId: resume.userId,
      fileUrl: resume.fileUrl,
      fileName: resume.fileName,
      fileSize: resume.fileSize,
      text: resume.text,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  @Post("job/stream")
  async streamJob(
    @Body() dto: AnalyzeJobDto,
    @Request() req: any,
    @Res() reply: FastifyReply
  ) {
    // Check auth but don't require it for streaming (optional)
    try {
      await this.getUserId(req);
    } catch {
      // Auth is optional for streaming
    }

    const streamResult = this.analysisService.streamJob({
      url: dto.url,
      text: dto.text,
    });

    if (!streamResult) {
      // Should not happen with current providers, but handle gracefully
      return reply.status(500).send({
        error: "Failed to initialize streaming",
      });
    }

    // Use toTextStreamResponse() - this is the correct method for useObject
    // It returns a Response object with headers and body stream
    const response = streamResult.toTextStreamResponse();

    // CRITICAL: Use reply.raw directly to bypass Fastify compress plugin
    // This ensures chunks are sent immediately without buffering

    // Get origin from request for CORS
    // Extract origin from referer if origin header is not present
    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer as string);
        origin = refererUrl.origin;
      } catch {
        // If parsing fails, use wildcard
        origin = "*";
      }
    }
    // Fallback to wildcard if no origin found (shouldn't happen with CORS)
    if (!origin) {
      origin = "*";
    }

    // Build headers object - force no compression + CORS
    const headers: Record<string, string> = {
      "content-type": "text/plain; charset=utf-8",
      "content-encoding": "identity", // Force no compression
      "x-accel-buffering": "no",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // CORS headers (required when using reply.raw)
      "access-control-allow-origin": origin as string,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "GET,HEAD,POST",
      "access-control-allow-headers": "content-type",
    };

    // Add headers from AI SDK response (but override content-encoding)
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        !lowerKey.startsWith("access-control")
      ) {
        headers[lowerKey] = value;
      }
    }

    // Convert Web ReadableStream to Node.js Readable stream
    if (response.body) {
      const { Readable } = await import("stream");
      const reader = response.body.getReader();
      let chunkCount = 0;

      const nodeStream = new Readable({
        objectMode: false,
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              console.log(
                `[Stream] Finished. Total chunks sent: ${chunkCount}`
              );
              this.push(null);
              return;
            }

            // CRITICAL: Push immediately - don't wait or buffer
            chunkCount++;
            const chunkSize = value?.byteLength || 0;

            // Push chunk immediately to avoid buffering
            this.push(Buffer.from(value));

            // Log first few chunks for debugging
            if (chunkCount <= 3) {
              const chunkText = new TextDecoder().decode(value);
              console.log(
                `[Stream] Chunk #${chunkCount}, size: ${chunkSize}B, preview: ${JSON.stringify(chunkText.slice(0, 50))}`
              );
            }
          } catch (error) {
            console.error("[Stream] Error:", error);
            this.destroy(error as Error);
          }
        },
      });

      // CRITICAL: Write headers directly to raw response to bypass compress
      reply.raw.writeHead(response.status, headers);

      // Pipe stream directly to raw response - bypasses Fastify compression
      nodeStream.pipe(reply.raw, { end: true });

      return;
    }

    // Fallback if no body
    reply.raw.writeHead(response.status, headers);
    reply.raw.end();
    return;
  }

  @Post("resume/stream")
  async streamResume(
    @Body() dto: CreateResumeDto,
    @Request() req: any,
    @Res() reply: FastifyReply
  ) {
    // Check auth but don't require it for streaming (optional)
    try {
      await this.getUserId(req);
    } catch {
      // Auth is optional for streaming
    }

    const streamResult = this.analysisService.streamResume({
      text: dto.text,
    });

    if (!streamResult) {
      // Should not happen with current providers, but handle gracefully
      return reply.status(500).send({
        error: "Failed to initialize streaming",
      });
    }

    // Use toTextStreamResponse() - this is the correct method for useObject
    // It returns a Response object with headers and body stream
    const response = streamResult.toTextStreamResponse();

    // CRITICAL: Use reply.raw directly to bypass Fastify compress plugin
    // This ensures chunks are sent immediately without buffering

    // Get origin from request for CORS
    // Extract origin from referer if origin header is not present
    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer as string);
        origin = refererUrl.origin;
      } catch {
        // If parsing fails, use wildcard
        origin = "*";
      }
    }
    // Fallback to wildcard if no origin found (shouldn't happen with CORS)
    if (!origin) {
      origin = "*";
    }

    // Build headers object - force no compression + CORS
    const headers: Record<string, string> = {
      "content-type": "text/plain; charset=utf-8",
      "content-encoding": "identity", // Force no compression
      "x-accel-buffering": "no",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // CORS headers (required when using reply.raw)
      "access-control-allow-origin": origin as string,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "GET,HEAD,POST",
      "access-control-allow-headers": "content-type",
    };

    // Add headers from AI SDK response (but override content-encoding)
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "content-encoding" &&
        !lowerKey.startsWith("access-control")
      ) {
        headers[lowerKey] = value;
      }
    }

    // Convert Web ReadableStream to Node.js Readable stream
    if (response.body) {
      const { Readable } = await import("stream");
      const reader = response.body.getReader();
      let chunkCount = 0;

      const nodeStream = new Readable({
        objectMode: false,
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              console.log(
                `[Stream] Finished. Total chunks sent: ${chunkCount}`
              );
              this.push(null);
              return;
            }

            // CRITICAL: Push immediately - don't wait or buffer
            chunkCount++;
            const chunkSize = value?.byteLength || 0;

            // Push chunk immediately to avoid buffering
            this.push(Buffer.from(value));

            // Log first few chunks for debugging
            if (chunkCount <= 3) {
              const chunkText = new TextDecoder().decode(value);
              console.log(
                `[Stream] Chunk #${chunkCount}, size: ${chunkSize}B, preview: ${JSON.stringify(chunkText.slice(0, 50))}`
              );
            }
          } catch (error) {
            console.error("[Stream] Error:", error);
            this.destroy(error as Error);
          }
        },
      });

      // CRITICAL: Write headers directly to raw response to bypass compress
      reply.raw.writeHead(response.status, headers);

      // Pipe stream directly to raw response - bypasses Fastify compression
      nodeStream.pipe(reply.raw, { end: true });

      return;
    }

    // Fallback if no body
    reply.raw.writeHead(response.status, headers);
    reply.raw.end();
    return;
  }

  @Post("compatibility")
  @ApiBody({ type: CreateAnalysisDto })
  @ApiCreatedResponse({
    type: AnalysisDto,
    description: "Analyze compatibility between a resume and a job description",
  })
  async analyzeCompatibility(
    @Body() dto: CreateAnalysisDto,
    @Request() req: any
  ): Promise<AnalysisDto> {
    const userId = await this.getUserId(req);

    const analysis = await this.analysisService.analyzeCompatibility({
      resumeId: dto.resumeId,
      jobId: dto.jobId,
      userId,
    });

    return {
      id: analysis.id,
      userId: analysis.userId,
      jobId: analysis.jobId,
      resumeId: analysis.resumeId,
      overallScore: analysis.overallScore,
      breakdown: analysis.breakdown,
      gaps: analysis.gaps,
      recommendations: analysis.recommendations,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }

  @Get("compatibility/:id")
  @ApiOkResponse({
    type: AnalysisDto,
    description: "Get compatibility analysis by ID",
  })
  async getAnalysis(@Param("id") id: string): Promise<AnalysisDto | undefined> {
    const analysis = await this.analysisService.getAnalysis(id);

    if (!analysis) {
      return;
    }

    return {
      id: analysis.id,
      userId: analysis.userId,
      jobId: analysis.jobId,
      resumeId: analysis.resumeId,
      overallScore: analysis.overallScore,
      breakdown: analysis.breakdown,
      gaps: analysis.gaps,
      recommendations: analysis.recommendations,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
