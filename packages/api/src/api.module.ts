import { Module } from "@nestjs/common";
import { TodosModule } from "./todos/todos.module.js";

@Module({
  imports: [TodosModule],
  exports: [TodosModule],
})
export class ApiModule {}
