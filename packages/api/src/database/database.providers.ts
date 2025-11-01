import type { Provider } from "@nestjs/common";
import { db } from "@resumematch/db";

export const DRIZZLE = "DRIZZLE_DB" as const;

export const dbProvider: Provider = {
  provide: DRIZZLE,
  useFactory: async () => db,
};
