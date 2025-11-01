import { ApiProperty } from "@nestjs/swagger";

class KeywordDto {
  @ApiProperty()
  word!: string;

  @ApiProperty()
  frequency!: number;
}

export class JobDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  company?: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty({ required: false, nullable: true })
  url?: string | null;

  @ApiProperty({ type: [String], default: [] })
  requiredSkills!: string[];

  @ApiProperty({ type: [String], default: [] })
  preferredSkills!: string[];

  @ApiProperty({ type: [KeywordDto], default: [] })
  keywords!: KeywordDto[];

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
