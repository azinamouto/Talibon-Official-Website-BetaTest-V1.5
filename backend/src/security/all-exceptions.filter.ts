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
import { safeFieldErrors } from './cms-validation';
import { classifyFailure } from './failure-diagnostics';

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
    let fields = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorType = ({400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',409:'Conflict',413:'Payload Too Large',429:'Too Many Requests'} as Record<number,string>)[status] || errorType;
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || message;
        errorType = obj.error || errorType;
        if (status === 400) fields = safeFieldErrors(obj.fieldErrors);
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
        message = 'Request body exceeds the allowed size.';
      }
    }

    response.setHeader('Cache-Control', 'private, no-store');
    this.logger.warn(JSON.stringify({
      status, method: request.method, route: request.route?.path || 'unmatched',
      requestId: (request as Request & { requestId?: string }).requestId,
    }));

    // Sanitize response body to avoid leaking internal DB/stack trace details in 500 errors
    let clientMessage = message;
    let failureCode: 'dependency_unavailable' | 'operation_unconfirmed' | undefined;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      errorType = "Internal Server Error";
      clientMessage = "An internal server error occurred. Please contact the administrator if this persists.";
      if (status === 503 && /^\/api\/admin\/(media|content)(\/|$)/.test(request.path)) {
        const details = classifyFailure(exception);
        // A fixed recovery hint only: never expose SQLSTATE, role predicates,
        // schema names, provider messages or transaction internals to clients.
        failureCode = ['invalid_configuration','media_category_missing','cms_schema_missing','cms_permission_missing',
          'permission_denied','relation_missing','column_missing','runtime_role_guard_rejected','database_authentication_failed',
          'storage_bucket_missing','storage_authentication_failed','storage_access_denied','storage_operation_unsupported'].includes(details.reason)
          ? 'dependency_unavailable' : 'operation_unconfirmed';
      }
    }

    response.status(status).json({
      success: false,
      requestId: (request as Request & { requestId?: string }).requestId,
      statusCode: status,
      error: errorType,
      message: clientMessage,
      ...(failureCode ? { failureCode } : {}),
      ...(Object.keys(fields).length ? { fieldErrors: fields } : {}),
      timestamp: new Date().toISOString()
    });
  }
}
