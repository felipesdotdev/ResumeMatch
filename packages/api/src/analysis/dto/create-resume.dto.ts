import { ApiProperty } from "@nestjs/swagger";

export class CreateResumeDto {
  @ApiProperty({
    description: "Resume text content",
    example: "John Doe\nSoftware Engineer\n5 years of experience...",
  })
  text!: string;

  @ApiProperty({
    description: "File URL (optional, for future file upload)",
    required: false,
  })
  fileUrl?: string;

  @ApiProperty({
    description: "File name (optional)",
    required: false,
  })
  fileName?: string;
}
