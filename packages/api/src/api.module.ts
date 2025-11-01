import { Module } from "@nestjs/common";
import { AnalysisModule } from "./analysis/analysis.module.js";
import { TodosModule } from "./todos/todos.module.js";

@Module({
  imports: [TodosModule, AnalysisModule],
  exports: [TodosModule, AnalysisModule],
})
export class ApiModule {}
