import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ApiModule } from '@resumematch/api/api.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 5000,
      max: 1000,
    }),
    ApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
