import { ApiProperty } from "@nestjs/swagger";

export class AnalyzeJobDto {
  @ApiProperty({
    description: "URL of the job posting (optional)",
    required: false,
    example: "https://example.com/job-posting",
  })
  url?: string;

  @ApiProperty({
    description: "Job description text (optional if URL is provided)",
    required: false,
    example: "We are looking for a Senior Full Stack Developer...",
  })
  text?: string;
}
