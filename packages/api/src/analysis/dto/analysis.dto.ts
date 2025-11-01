import { ApiProperty } from "@nestjs/swagger";

export class GapDto {
  @ApiProperty({ enum: ["skill", "keyword", "experience", "education"] })
  type!: "skill" | "keyword" | "experience" | "education";

  @ApiProperty()
  missing!: string;

  @ApiProperty({ required: false })
  frequency?: number;

  @ApiProperty({ enum: ["high", "medium", "low"] })
  importance!: "high" | "medium" | "low";
}

export class RecommendationDto {
  @ApiProperty()
  section!: string;

  @ApiProperty()
  current!: string;

  @ApiProperty()
  suggested!: string;
}

export class ScoreWeightDto {
  @ApiProperty()
  score!: number;

  @ApiProperty()
  weight!: number;
}

export class BreakdownDto {
  @ApiProperty({ type: ScoreWeightDto })
  skills!: ScoreWeightDto;

  @ApiProperty({ type: ScoreWeightDto })
  experience!: ScoreWeightDto;

  @ApiProperty({ type: ScoreWeightDto })
  keywords!: ScoreWeightDto;

  @ApiProperty({ type: ScoreWeightDto })
  education!: ScoreWeightDto;
}

export class AnalysisDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  resumeId!: string;

  @ApiProperty({ description: "Overall compatibility score (0-100)" })
  overallScore!: number;

  @ApiProperty({ type: BreakdownDto })
  breakdown!: BreakdownDto;

  @ApiProperty({ type: [GapDto] })
  gaps!: GapDto[];

  @ApiProperty({ type: [RecommendationDto] })
  recommendations!: RecommendationDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
