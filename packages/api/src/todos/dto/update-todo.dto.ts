import { ApiProperty } from "@nestjs/swagger";

export class UpdateTodoDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  completed?: boolean;
}
