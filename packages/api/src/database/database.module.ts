import { Module } from "@nestjs/common";
import { dbProvider } from "./database.providers.js";

@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DatabaseModule {}
