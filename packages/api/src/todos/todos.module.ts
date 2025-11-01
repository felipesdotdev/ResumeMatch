import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TodosController } from "./todos.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [TodosController],
})
export class TodosModule {}
