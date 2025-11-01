import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AnalysisController } from "./analysis.controller.js";
import { AnalysisService } from "./analysis.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
