import { ApiProperty } from "@nestjs/swagger";

export class CreateAnalysisDto {
  @ApiProperty({
    description: "Resume ID to analyze",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  resumeId!: string;

  @ApiProperty({
    description: "Job ID to compare against",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  jobId!: string;
}
