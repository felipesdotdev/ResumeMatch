import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type AnalysisRecord,
  createAnalysis,
  createJob,
  createResume,
  getAnalysisById,
  getJobById,
  getResumeById,
  type JobRecord,
  type ResumeRecord,
} from "@resumematch/db";
import { AIService } from "./ai.service.js";

@Injectable()
export class AnalysisService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Streams job description analysis
   * Returns null if streaming is not supported (e.g., Groq)
   */
  streamJob(data: { url?: string; text?: string }) {
    if (!(data.url || data.text)) {
      return null;
    }

    if (data.url && data.text) {
      return null;
    }

    const jobText = data.text || "";
    return this.aiService.streamJobDescription(jobText);
  }

  /**
   * Streams resume analysis
   * Returns null if streaming is not supported (e.g., Groq)
   */
  streamResume(data: { text: string }) {
    if (!data.text || data.text.trim().length === 0) {
      return null;
    }

    return this.aiService.streamResumeText(data.text);
  }

  /**
   * Analyzes a job description from URL or text using AI
   */
  async analyzeJob(data: {
    url?: string;
    text?: string;
    userId: string;
  }): Promise<JobRecord> {
    if (!(data.url || data.text)) {
      throw new BadRequestException("Either url or text must be provided");
    }

    if (data.url && data.text) {
      throw new BadRequestException("Provide either url or text, not both");
    }

    const jobText = data.text || "";

    // Use AI to analyze the job description
    let analysis;
    try {
      console.log("[AnalysisService] Starting AI job analysis...");
      analysis = await this.aiService.analyzeJobDescription(jobText);
      console.log("[AnalysisService] AI analysis completed successfully:", {
        title: analysis.title,
        company: analysis.company,
        requiredSkillsCount: analysis.requiredSkills?.length || 0,
        preferredSkillsCount: analysis.preferredSkills?.length || 0,
        keywordsCount: analysis.keywords?.length || 0,
      });
    } catch (error: unknown) {
      // Fallback to basic parsing if AI fails (e.g., no API key, rate limit, etc.)
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // If it's a configuration error, log it but don't fail the request
      if (errorMessage.includes("No AI provider configured")) {
        console.warn(
          "[AnalysisService] AI provider not configured. Using basic text parsing. To enable AI analysis, set ANTHROPIC_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in your environment variables."
        );
      } else {
        console.error("[AnalysisService] AI analysis failed, using fallback:", {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      return this.analyzeJobFallback(data);
    }

    // Convert AI analysis to job record format
    const keywords = analysis.keywords || [];

    const job = await createJob({
      title: analysis.title || "Job Position",
      company: analysis.company || undefined,
      description: analysis.description || jobText,
      url: data.url || undefined,
      requiredSkills: analysis.requiredSkills || [],
      preferredSkills: analysis.preferredSkills || [],
      keywords,
      userId: data.userId,
    });

    return job;
  }

  /**
   * Fallback method using basic parsing (if AI fails)
   */
  private analyzeJobFallback(data: {
    url?: string;
    text?: string;
    userId: string;
  }): Promise<JobRecord> {
    const description = data.text || "";
    const title = this.extractTitle(description);
    const company = this.extractCompany(description);
    const keywords = this.extractKeywords(description);
    const requiredSkills = this.extractSkills(description, true);
    const preferredSkills = this.extractSkills(description, false);

    return createJob({
      title,
      company,
      description: data.text || "",
      url: data.url || undefined,
      requiredSkills,
      preferredSkills,
      keywords,
      userId: data.userId,
    });
  }

  async getJob(jobId: string): Promise<JobRecord | undefined> {
    return getJobById(jobId);
  }

  // Simple extraction methods (will be replaced with AI later)
  private extractTitle(text: string): string {
    // Try to find job title patterns
    const titlePatterns = [
      /(?:Job Title|Position|Title):\s*(.+)/i,
      /(?:We are|Looking for|Seeking)\s+(?:a\s+)?(?:Senior\s+|Junior\s+|Mid-level\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Developer|Engineer|Designer|Manager)/,
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return "Job Position"; // Default fallback
  }

  private extractCompany(text: string): string | undefined {
    const companyPatterns = [
      /(?:Company|About|at)\s+([A-Z][a-zA-Z\s&]+)/,
      /([A-Z][a-zA-Z\s&]{3,})\s+(?:is|seeks|looking)/,
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return;
  }

  private extractKeywords(text: string): { word: string; frequency: number }[] {
    // Simple keyword frequency analysis
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4); // Filter short words

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .map(([word, frequency]) => ({ word, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20); // Top 20 keywords
  }

  private extractSkills(text: string, _required: boolean): string[] {
    // Simple skill extraction - will be replaced with AI
    // The `required` parameter will be used when we implement AI-based extraction
    const skillKeywords = [
      "javascript",
      "typescript",
      "python",
      "react",
      "node",
      "postgresql",
      "docker",
      "kubernetes",
      "aws",
      "git",
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of skillKeywords) {
      if (lowerText.includes(skill)) {
        found.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    }

    return found;
  }

  /**
   * Analyzes and parses a resume from text using AI
   */
  async analyzeResume(data: {
    text: string;
    userId: string;
    fileUrl?: string;
    fileName?: string;
  }): Promise<ResumeRecord> {
    if (!data.text || data.text.trim().length === 0) {
      throw new BadRequestException("Resume text is required");
    }

    // Use AI to analyze the resume
    let analysis;
    try {
      console.log("[AnalysisService] Starting AI resume analysis...");
      analysis = await this.aiService.analyzeResumeText(data.text);
      console.log(
        "[AnalysisService] AI resume analysis completed successfully:",
        {
          skillsCount: analysis.skills?.length || 0,
          experienceCount: analysis.experience?.length || 0,
          educationCount: analysis.education?.length || 0,
        }
      );
    } catch (error: unknown) {
      // Fallback to basic parsing if AI fails (e.g., no API key, rate limit, etc.)
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // If it's a configuration error, log it but don't fail the request
      if (errorMessage.includes("No AI provider configured")) {
        console.warn(
          "[AnalysisService] AI provider not configured. Using basic text parsing. To enable AI analysis, set ANTHROPIC_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in your environment variables."
        );
      } else {
        console.error(
          "[AnalysisService] AI resume analysis failed, using fallback:",
          {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          }
        );
      }

      return this.analyzeResumeFallback(data);
    }

    // Convert null to undefined for optional fields
    const experience = (analysis.experience || []).map((exp) => ({
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate ?? undefined,
      endDate: exp.endDate ?? undefined,
      description: exp.description ?? undefined,
    }));

    const education = (analysis.education || []).map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      field: edu.field ?? undefined,
      graduationDate: edu.graduationDate ?? undefined,
    }));

    const resume = await createResume({
      userId: data.userId,
      text: data.text,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      skills: analysis.skills || [],
      experience,
      education,
    });

    return resume;
  }

  /**
   * Fallback method using basic parsing (if AI fails)
   */
  private analyzeResumeFallback(data: {
    text: string;
    userId: string;
    fileUrl?: string;
    fileName?: string;
  }): Promise<ResumeRecord> {
    const skills = this.extractSkillsFromResume(data.text);
    const experience = this.extractExperienceFromResume(data.text);
    const education = this.extractEducationFromResume(data.text);

    return createResume({
      userId: data.userId,
      text: data.text,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      skills,
      experience,
      education,
    });
  }

  async getResume(resumeId: string): Promise<ResumeRecord | undefined> {
    return getResumeById(resumeId);
  }

  private extractSkillsFromResume(text: string): string[] {
    // Simple skill extraction - will be replaced with AI
    const skillKeywords = [
      "javascript",
      "typescript",
      "python",
      "java",
      "react",
      "vue",
      "angular",
      "node",
      "express",
      "nestjs",
      "postgresql",
      "mysql",
      "mongodb",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "git",
      "html",
      "css",
      "sass",
      "tailwind",
      "bootstrap",
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of skillKeywords) {
      if (lowerText.includes(skill)) {
        found.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    }

    return [...new Set(found)]; // Remove duplicates
  }

  private extractExperienceFromResume(text: string): Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }> {
    // Simple experience extraction - will be replaced with AI
    // For now, try to find common patterns
    const lines = text.split("\n");
    const experience: Array<{
      title: string;
      company: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // Look for job title patterns
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes("developer") ||
        lowerLine.includes("engineer") ||
        lowerLine.includes("manager") ||
        lowerLine.includes("analyst") ||
        lowerLine.includes("designer")
      ) {
        const nextLine = i + 1 < lines.length ? lines[i + 1]?.trim() : "";

        // Try to find company name in next line
        if (nextLine) {
          experience.push({
            title: line,
            company: nextLine,
          });
        }
      }
    }

    return experience.length > 0 ? experience : [];
  }

  private extractEducationFromResume(text: string): Array<{
    degree: string;
    institution: string;
    field?: string;
    graduationDate?: string;
  }> {
    // Simple education extraction - will be replaced with AI
    const lines = text.split("\n");
    const education: Array<{
      degree: string;
      institution: string;
      field?: string;
      graduationDate?: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.trim().toLowerCase();

      // Look for degree patterns
      if (
        line.includes("bachelor") ||
        line.includes("master") ||
        line.includes("phd") ||
        line.includes("graduation")
      ) {
        const nextLine = i + 1 < lines.length ? lines[i + 1]?.trim() : "";

        if (nextLine) {
          education.push({
            degree: currentLine.trim(),
            institution: nextLine,
          });
        }
      }
    }

    return education.length > 0 ? education : [];
  }

  /**
   * Analyzes compatibility between a resume and a job description
   * Calculates scores and identifies gaps
   */
  async analyzeCompatibility(data: {
    resumeId: string;
    jobId: string;
    userId: string;
  }): Promise<AnalysisRecord> {
    // Fetch resume and job
    const resume = await getResumeById(data.resumeId);
    if (!resume) {
      throw new NotFoundException(`Resume with ID ${data.resumeId} not found`);
    }

    // Verify resume belongs to user
    if (resume.userId !== data.userId) {
      throw new BadRequestException(
        "Resume does not belong to the current user"
      );
    }

    const job = await getJobById(data.jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${data.jobId} not found`);
    }

    // Verify job belongs to user
    if (job.userId !== data.userId) {
      throw new BadRequestException("Job does not belong to the current user");
    }

    // Calculate compatibility scores
    const skillsScore = this.calculateSkillsScore(
      resume.skills,
      job.requiredSkills,
      job.preferredSkills
    );
    const experienceScore = this.calculateExperienceScore(
      resume.experience,
      job.requiredSkills,
      job.description
    );
    const keywordsScore = this.calculateKeywordsScore(
      resume.text,
      job.keywords
    );
    const educationScore = this.calculateEducationScore(
      resume.education,
      job.description
    );

    // Calculate weighted overall score
    const weights = {
      skills: 0.4,
      experience: 0.3,
      keywords: 0.2,
      education: 0.1,
    };

    const overallScore = Math.round(
      skillsScore * weights.skills +
        experienceScore * weights.experience +
        keywordsScore * weights.keywords +
        educationScore * weights.education
    );

    // Identify gaps
    const gaps = this.identifyGaps(resume, job);

    // Generate recommendations
    const recommendations = this.generateRecommendations(resume, job, gaps);

    // Create analysis record
    const analysis = await createAnalysis({
      userId: data.userId,
      jobId: data.jobId,
      resumeId: data.resumeId,
      overallScore,
      breakdown: {
        skills: { score: skillsScore, weight: weights.skills },
        experience: { score: experienceScore, weight: weights.experience },
        keywords: { score: keywordsScore, weight: weights.keywords },
        education: { score: educationScore, weight: weights.education },
      },
      gaps,
      recommendations,
    });

    return analysis;
  }

  async getAnalysis(analysisId: string): Promise<AnalysisRecord | undefined> {
    return getAnalysisById(analysisId);
  }

  /**
   * Calculates skills compatibility score (0-100)
   * Considers both required and preferred skills
   */
  private calculateSkillsScore(
    resumeSkills: string[],
    requiredSkills: string[],
    preferredSkills: string[]
  ): number {
    if (requiredSkills.length === 0 && preferredSkills.length === 0) {
      return 100; // No skills specified, assume perfect match
    }

    const normalizeSkill = (skill: string): string =>
      skill.toLowerCase().trim().replace(/\s+/g, " ");

    const normalizedResumeSkills = resumeSkills.map(normalizeSkill);

    // Calculate required skills match
    let requiredMatch = 0;
    if (requiredSkills.length > 0) {
      const matchedRequired = requiredSkills.filter((skill) =>
        normalizedResumeSkills.some(
          (resumeSkill) =>
            resumeSkill.includes(normalizeSkill(skill)) ||
            normalizeSkill(skill).includes(resumeSkill)
        )
      ).length;
      requiredMatch = (matchedRequired / requiredSkills.length) * 100;
    }

    // Calculate preferred skills match
    let preferredMatch = 0;
    if (preferredSkills.length > 0) {
      const matchedPreferred = preferredSkills.filter((skill) =>
        normalizedResumeSkills.some(
          (resumeSkill) =>
            resumeSkill.includes(normalizeSkill(skill)) ||
            normalizeSkill(skill).includes(resumeSkill)
        )
      ).length;
      preferredMatch = (matchedPreferred / preferredSkills.length) * 100;
    }

    // Weighted score: 70% required, 30% preferred
    if (requiredSkills.length === 0) {
      return Math.round(preferredMatch);
    }
    if (preferredSkills.length === 0) {
      return Math.round(requiredMatch);
    }

    return Math.round(requiredMatch * 0.7 + preferredMatch * 0.3);
  }

  /**
   * Calculates experience compatibility score (0-100)
   * Based on relevance of experience to job requirements
   */
  private calculateExperienceScore(
    resumeExperience: Array<{
      title: string;
      company: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>,
    requiredSkills: string[],
    jobDescription: string
  ): number {
    if (resumeExperience.length === 0) {
      return 0;
    }

    const normalize = (text: string): string => text.toLowerCase().trim();

    const jobText = normalize(jobDescription);
    let totalRelevance = 0;

    for (const exp of resumeExperience) {
      let relevance = 0;
      const expText = normalize(`${exp.title} ${exp.description || ""}`);

      // Check if experience mentions required skills
      if (requiredSkills.length > 0) {
        const matchedSkills = requiredSkills.filter((skill) =>
          expText.includes(normalize(skill))
        ).length;
        relevance += (matchedSkills / requiredSkills.length) * 50;
      }

      // Check if experience is relevant to job description keywords
      const expKeywords = expText.split(/\s+/).filter((w) => w.length > 4);
      const jobKeywords = jobText.split(/\s+/).filter((w) => w.length > 4);
      const commonKeywords = expKeywords.filter((kw) =>
        jobKeywords.includes(kw)
      ).length;
      relevance += Math.min(
        (commonKeywords / Math.max(expKeywords.length, 1)) * 50,
        50
      );

      totalRelevance += Math.min(relevance, 100);
    }

    return Math.round(totalRelevance / resumeExperience.length);
  }

  /**
   * Calculates keywords compatibility score (0-100)
   * Based on keyword frequency match between resume and job
   */
  private calculateKeywordsScore(
    resumeText: string,
    jobKeywords: Array<{ word: string; frequency: number }>
  ): number {
    if (jobKeywords.length === 0) {
      return 100; // No keywords specified, assume perfect match
    }

    const normalize = (text: string): string => text.toLowerCase().trim();

    const normalizedResume = normalize(resumeText);
    let matchedKeywords = 0;
    let totalFrequency = 0;

    for (const keyword of jobKeywords) {
      const normalizedKeyword = normalize(keyword.word);
      if (normalizedResume.includes(normalizedKeyword)) {
        matchedKeywords++;
        totalFrequency += keyword.frequency;
      }
    }

    // Calculate score based on matched keywords and their frequencies
    const frequencyWeight = jobKeywords.reduce(
      (sum, kw) => sum + kw.frequency,
      0
    );
    const matchedFrequencyWeight = totalFrequency;

    // Score: 50% based on keyword match count, 50% based on frequency weight
    const countScore = (matchedKeywords / jobKeywords.length) * 50;
    const frequencyScore =
      frequencyWeight > 0 ? (matchedFrequencyWeight / frequencyWeight) * 50 : 0;

    return Math.round(countScore + frequencyScore);
  }

  /**
   * Calculates education compatibility score (0-100)
   * Based on relevance of education to job requirements
   */
  private calculateEducationScore(
    resumeEducation: Array<{
      degree: string;
      institution: string;
      field?: string;
      graduationDate?: string;
    }>,
    jobDescription: string
  ): number {
    if (resumeEducation.length === 0) {
      return 50; // No education specified, give neutral score
    }

    const normalize = (text: string): string => text.toLowerCase().trim();

    const jobText = normalize(jobDescription);
    let maxRelevance = 0;

    for (const edu of resumeEducation) {
      const eduText = normalize(`${edu.degree} ${edu.field || ""}`);

      // Check if education field matches job description keywords
      const eduKeywords = eduText.split(/\s+/).filter((w) => w.length > 3);
      const jobKeywords = jobText.split(/\s+/).filter((w) => w.length > 3);
      const commonKeywords = eduKeywords.filter((kw) =>
        jobKeywords.includes(kw)
      ).length;

      const relevance =
        eduKeywords.length > 0
          ? (commonKeywords / eduKeywords.length) * 100
          : 50;

      maxRelevance = Math.max(maxRelevance, relevance);
    }

    return Math.round(maxRelevance);
  }

  /**
   * Identifies gaps between resume and job requirements
   */
  private identifyGaps(
    resume: ResumeRecord,
    job: JobRecord
  ): Array<{
    type: "skill" | "keyword" | "experience" | "education";
    missing: string;
    frequency?: number;
    importance: "high" | "medium" | "low";
  }> {
    const gaps: Array<{
      type: "skill" | "keyword" | "experience" | "education";
      missing: string;
      frequency?: number;
      importance: "high" | "medium" | "low";
    }> = [];

    const normalizeSkill = (skill: string): string =>
      skill.toLowerCase().trim().replace(/\s+/g, " ");

    const normalizedResumeSkills = resume.skills.map(normalizeSkill);

    // Identify missing required skills (high importance)
    for (const requiredSkill of job.requiredSkills) {
      const normalizedSkill = normalizeSkill(requiredSkill);
      const hasSkill = normalizedResumeSkills.some(
        (resumeSkill) =>
          resumeSkill.includes(normalizedSkill) ||
          normalizedSkill.includes(resumeSkill)
      );

      if (!hasSkill) {
        gaps.push({
          type: "skill",
          missing: requiredSkill,
          importance: "high",
        });
      }
    }

    // Identify missing preferred skills (medium importance)
    for (const preferredSkill of job.preferredSkills) {
      const normalizedSkill = normalizeSkill(preferredSkill);
      const hasSkill = normalizedResumeSkills.some(
        (resumeSkill) =>
          resumeSkill.includes(normalizedSkill) ||
          normalizedSkill.includes(resumeSkill)
      );

      if (!hasSkill) {
        gaps.push({
          type: "skill",
          missing: preferredSkill,
          importance: "medium",
        });
      }
    }

    // Identify missing keywords (importance based on frequency)
    const normalize = (text: string): string => text.toLowerCase().trim();

    const normalizedResume = normalize(resume.text);
    for (const keyword of job.keywords) {
      const normalizedKeyword = normalize(keyword.word);
      if (!normalizedResume.includes(normalizedKeyword)) {
        const importance =
          keyword.frequency >= 5
            ? "high"
            : keyword.frequency >= 2
              ? "medium"
              : "low";

        gaps.push({
          type: "keyword",
          missing: keyword.word,
          frequency: keyword.frequency,
          importance,
        });
      }
    }

    return gaps;
  }

  /**
   * Generates recommendations for improving resume
   */
  private generateRecommendations(
    resume: ResumeRecord,
    _job: JobRecord,
    gaps: Array<{
      type: "skill" | "keyword" | "experience" | "education";
      missing: string;
      frequency?: number;
      importance: "high" | "medium" | "low";
    }>
  ): Array<{
    section: string;
    current: string;
    suggested: string;
  }> {
    const recommendations: Array<{
      section: string;
      current: string;
      suggested: string;
    }> = [];

    // Recommendations for missing high-importance skills
    const highImportanceSkills = gaps
      .filter((gap) => gap.type === "skill" && gap.importance === "high")
      .slice(0, 3); // Top 3 missing skills

    if (highImportanceSkills.length > 0) {
      recommendations.push({
        section: "skills",
        current: `Missing critical skills: ${highImportanceSkills.map((g) => g.missing).join(", ")}`,
        suggested:
          "Consider adding these required skills to your resume. If you have experience with these technologies, highlight them in your experience section.",
      });
    }

    // Recommendations for missing keywords
    const highFrequencyKeywords = gaps
      .filter(
        (gap) =>
          gap.type === "keyword" &&
          gap.frequency !== undefined &&
          gap.frequency >= 3
      )
      .slice(0, 3);

    if (highFrequencyKeywords.length > 0) {
      recommendations.push({
        section: "keywords",
        current: `Missing important keywords: ${highFrequencyKeywords.map((g) => g.missing).join(", ")}`,
        suggested:
          "Incorporate these keywords naturally into your resume, especially in your experience descriptions.",
      });
    }

    // Recommendation for experience improvements
    if (resume.experience.length === 0) {
      recommendations.push({
        section: "experience",
        current: "No professional experience listed",
        suggested:
          "Add your professional experience with detailed descriptions of your achievements and responsibilities.",
      });
    } else {
      // Check if experience descriptions are detailed enough
      const hasDescriptions = resume.experience.some(
        (exp) => exp.description && exp.description.length > 50
      );

      if (!hasDescriptions) {
        recommendations.push({
          section: "experience",
          current: "Experience entries lack detailed descriptions",
          suggested:
            "Expand your experience descriptions to include specific achievements, technologies used, and impact you made. Use action verbs and quantifiable results.",
        });
      }
    }

    return recommendations;
  }
}
