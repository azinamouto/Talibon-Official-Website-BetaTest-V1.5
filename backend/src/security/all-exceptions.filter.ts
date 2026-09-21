import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("SecurityExceptionsFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "An unexpected error occurred. Please try again later.";
    let errorType = "Internal Server Error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || message;
        errorType = obj.error || errorType;
      }
    } else if (exception && typeof exception === 'object' && 'type' in exception) {
      // Express body-parser failures happen before DTO validation.
      if (exception.type === 'entity.parse.failed') {
        status = 400;
        errorType = 'Bad Request';
        message = 'Malformed JSON request body.';
      } else if (exception.type === 'entity.too.large') {
        status = 413;
        errorType = 'Payload Too Large';
        message = 'Request body exceeds the 1 MB limit.';
      }
    }

    response.setHeader('Cache-Control', 'private, no-store');
    this.logger.warn(JSON.stringify({
      status, method: request.method, route: request.route?.path || 'unmatched',
      requestId: (request as Request & { requestId?: string }).requestId,
    }));

    // Sanitize response body to avoid leaking internal DB/stack trace details in 500 errors
    let clientMessage = message;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      clientMessage = "An internal server error occurred. Please contact the administrator if this persists.";
    }

    response.status(status).json({
      success: false,
      requestId: (request as Request & { requestId?: string }).requestId,
      statusCode: status,
      error: errorType,
      message: clientMessage,
      timestamp: new Date().toISOString()
    });
  }
}
