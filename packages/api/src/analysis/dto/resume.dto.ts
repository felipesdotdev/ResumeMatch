import { ApiProperty } from "@nestjs/swagger";

class ExperienceDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  company!: string;

  @ApiProperty({ required: false })
  startDate?: string;

  @ApiProperty({ required: false })
  endDate?: string;

  @ApiProperty({ required: false })
  description?: string;
}

class EducationDto {
  @ApiProperty()
  degree!: string;

  @ApiProperty()
  institution!: string;

  @ApiProperty({ required: false })
  field?: string;

  @ApiProperty({ required: false })
  graduationDate?: string;
}

export class ResumeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ required: false, nullable: true })
  fileUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  fileName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  fileSize?: string | null;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: [String], default: [] })
  skills!: string[];

  @ApiProperty({ type: [ExperienceDto], default: [] })
  experience!: ExperienceDto[];

  @ApiProperty({ type: [EducationDto], default: [] })
  education!: EducationDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
