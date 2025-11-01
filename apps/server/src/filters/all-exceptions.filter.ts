import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp ? exception.getResponse() : undefined;
    const responseMessage =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody
        ? responseBody.message
        : isHttp
          ? exception.message
          : 'Internal server error';

    const message =
      responseMessage ?? (isHttp ? exception.message : 'Internal server error');
    const errorCode = isHttp ? `HTTP_${status}` : 'INTERNAL_ERROR';

    response.status(status);
    response.type('application/json');
    response.send({
      error: {
        code: String(errorCode).toUpperCase(),
        message: Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : 'Internal server error',
        details: isHttp ? responseBody : undefined,
      },
    });
  }
}
