import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { auth } from '@resumematch/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;
const HTTP_UNAUTHORIZED = 401;
const RATE_LIMIT_MAX = 300; // requests
const RATE_LIMIT_WINDOW = '1 minute';
const MAX_EVENT_LOOP_DELAY_MS = 1000;
const KIBIBYTE = 1024;
const BYTES_IN_MB = KIBIBYTE * KIBIBYTE;
const MAX_HEAP_MB = 200;
const MAX_RSS_MB = 300;
const MAX_HEAP_USED_BYTES = MAX_HEAP_MB * BYTES_IN_MB;
const MAX_RSS_BYTES = MAX_RSS_MB * BYTES_IN_MB;

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: true });
  await adapter.register(helmet);
  await adapter.register(compress, { global: true });
  await adapter.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW,
  });
  await adapter.register(underPressure, {
    maxEventLoopDelay: MAX_EVENT_LOOP_DELAY_MS,
    maxHeapUsedBytes: MAX_HEAP_USED_BYTES,
    maxRssBytes: MAX_RSS_BYTES,
    healthCheck: () => Promise.resolve({ status: 'ok' }),
    healthCheckInterval: 5000,
    exposeStatusRoute: '/health',
  });
  await adapter.register(cors, { origin: true, credentials: true });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.get(
    '/private',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers || {})) {
        if (value) {
          headers.append(key, String(value));
        }
      }
      const session = await auth.api.getSession({ headers });
      if (session?.user) {
        return reply.send({
          message: `Olá, ${session.user.name || 'usuário'}!`,
        });
      }
      return reply
        .status(HTTP_UNAUTHORIZED)
        .send({ message: 'Você não está autenticado.' });
    },
  );
  fastifyInstance.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) {
          headers.append(key, String(value));
        }
      }
      const body = request.body ? JSON.stringify(request.body) : undefined;
      const reqOptions: RequestInit = {
        method: request.method,
        headers,
      };
      if (body && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        reqOptions.body = body;
      }
      const req = new Request(url.toString(), reqOptions);
      const response = await auth.handler(req);
      reply.status(response.status);
      for (const [key, value] of response.headers.entries()) {
        reply.header(key, value);
      }
      const text = response.body ? await response.text() : null;
      reply.send(text);
    },
  });

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(import('@fastify/swagger'), {
    openapi: {
      info: { title: 'ResumeMatch API', version: '1.0.0' },
      servers: [{ url: '/' }],
    },
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ResumeMatch API')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  await app.listen({
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    host: '0.0.0.0',
  });
}
void bootstrap();
