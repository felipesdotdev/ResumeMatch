import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  createTodo,
  deleteTodo,
  getAllTodos,
  getTodoById,
  type TodoRecord,
  updateTodo,
} from "@resumematch/db";
import type { CreateTodoDto } from "./dto/create-todo.dto.js";
import { TodoDto } from "./dto/todo.dto.js";
import type { UpdateTodoDto } from "./dto/update-todo.dto.js";

@ApiTags("todos")
@Controller("todos")
export class TodosController {
  @Get()
  @ApiOkResponse({ type: TodoDto, isArray: true, description: "List todos" })
  async findAll(): Promise<TodoDto[]> {
    const rows = await getAllTodos();
    return rows.map((r: TodoRecord) => ({
      id: r.id,
      title: r.text,
      completed: r.completed,
    }));
  }

  @Get(":id")
  @ApiOkResponse({ type: TodoDto })
  async findOne(@Param("id") id: string): Promise<TodoDto | undefined> {
    const r = await getTodoById(Number(id));
    return r ? { id: r.id, title: r.text, completed: r.completed } : undefined;
  }

  @Post()
  @ApiCreatedResponse({ type: TodoDto })
  async create(@Body() dto: CreateTodoDto): Promise<TodoDto> {
    if (!dto || typeof dto.title !== "string" || dto.title.trim() === "") {
      throw new BadRequestException("title is required");
    }
    const r = await createTodo(dto.title);
    return { id: r.id, title: r.text, completed: r.completed };
  }

  @Patch(":id")
  @ApiOkResponse({ type: TodoDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTodoDto
  ): Promise<TodoDto | undefined> {
    const values: { text?: string; completed?: boolean } = {};
    if (dto.title !== undefined) values.text = dto.title;
    if (dto.completed !== undefined) values.completed = dto.completed;
    const r = await updateTodo(Number(id), values);
    return r ? { id: r.id, title: r.text, completed: r.completed } : undefined;
  }

  @Delete(":id")
  @ApiNoContentResponse()
  async remove(@Param("id") id: string): Promise<void> {
    await deleteTodo(Number(id));
  }
}
