import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBadRequestResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permissions } from '../../security/permissions';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Admin reports') @ApiBearerAuth() @Permissions('reports:read')
@ApiUnauthorizedResponse({ description: 'Missing, expired or revoked session' })
@ApiForbiddenResponse({ description: 'Verified administrative permission required' })
@ApiBadRequestResponse({ description: 'Invalid date range or cursor' })
@ApiServiceUnavailableResponse({ description: 'Report storage unavailable' })
@ApiOkResponse({ description: 'Flat export-ready rows in data, plus nextCursor {before,beforeId} or null', schema: {
  type: 'object', properties: { data: { type: 'array', items: { type: 'object', additionalProperties: true } }, nextCursor: { type: 'object', nullable: true, properties: { before: { type: 'string', format: 'date-time' }, beforeId: { type: 'string', format: 'uuid' } } } },
} })
@RateLimit(RateLimitCategory.ADMIN_MUTATION)
@Controller('api/admin/reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}
  @Get('submissions') @ApiOperation({ summary: 'Export submission rows by creation date (includes soft-deleted history)' })
  submissions(@Query() query: ReportQueryDto) { return this.reports.report('submissions', query); }
  @Get('payments') @ApiOperation({ summary: 'Export payment ledger rows by creation date; amounts are decimal strings' })
  payments(@Query() query: ReportQueryDto) { return this.reports.report('payments', query); }
  @Get('user-activity') @ApiOperation({ summary: 'Export recorded API audit events (auth, mutations, and failures)' })
  activity(@Query() query: ReportQueryDto) { return this.reports.report('user-activity', query); }
}
