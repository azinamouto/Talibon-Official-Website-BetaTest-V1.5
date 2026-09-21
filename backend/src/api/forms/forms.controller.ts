import { Controller, Get, Post, Put, Body, Param, Inject, Req, Query, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateCertificateRequestDto, BarangayDetailsDto, IndigencyDetailsDto, BusinessDetailsDto, BuildingDetailsDto, ZoningDetailsDto } from './dto/certificate-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { Public, Roles, RequireAuth } from '../../security/auth.guard';
import { AuthenticatedRequest } from '../../security/authenticated-request';

@ApiTags('Forms')
@ApiExtraModels(BarangayDetailsDto, IndigencyDetailsDto, BusinessDetailsDto, BuildingDetailsDto, ZoningDetailsDto)
@Controller('api/forms')
export class FormsController {
  constructor(@Inject(FormsService) private readonly formsService: FormsService) {}

  @Get(['certificate', 'admin/submissions']) @ApiBearerAuth() @RequireAuth()
  @RateLimit(RateLimitCategory.ADMIN_MUTATION) @Roles('admin', 'super_admin', 'municipal_admin', 'staff')
  async getAllRequests(@Query() query: ListSubmissionsDto) { return this.formsService.getAllRequests(query); }

  @Post(['certificate', 'submissions']) @ApiBearerAuth() @RequireAuth()
  @ApiOperation({ summary: 'Submit any of the five form types, with typed details and authenticated ownership' })
  @RateLimit(RateLimitCategory.CITIZEN_SUBMISSION)
  async submitRequest(@Body() dto: CreateCertificateRequestDto, @Req() req: AuthenticatedRequest) {
    return this.formsService.submitRequest(dto, req.user);
  }

  @Get('submissions') @ApiBearerAuth() @RequireAuth() @RateLimit(RateLimitCategory.TRACKING)
  async getOwnRequests(@Query() query: ListSubmissionsDto, @Req() req: AuthenticatedRequest) {
    return this.formsService.list(query, req.user.id);
  }

  @Get(['certificate/:ticketId', 'submissions/:ticketId']) @ApiBearerAuth() @RequireAuth()
  @RateLimit(RateLimitCategory.TRACKING)
  async getRequestStatus(@Param('ticketId') ticketId: string, @Req() req: AuthenticatedRequest) {
    if (!ticketId.trim() || ticketId.length > 100) throw new BadRequestException('Invalid ticket ID.');
    return { success: true, request: await this.formsService.getRequestStatus(ticketId.trim(), req.user.id) };
  }

  @Get('admin/submissions/:id') @ApiBearerAuth() @RequireAuth()
  @Roles('admin', 'super_admin', 'municipal_admin', 'staff') @RateLimit(RateLimitCategory.ADMIN_MUTATION)
  async getAdminRequest(@Param('id', new ParseUUIDPipe()) id: string) {
    return { success: true, request: await this.formsService.getRequestStatus(id) };
  }

  @Put(['certificate/:id/status', 'admin/submissions/:id/status']) @ApiBearerAuth() @RequireAuth()
  @Roles('admin', 'super_admin', 'municipal_admin', 'staff') @RateLimit(RateLimitCategory.ADMIN_MUTATION)
  async updateRequestStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStatusDto, @Req() req: AuthenticatedRequest) {
    return this.formsService.updateRequestStatus(id, dto, req.user.id);
  }

  @Public() @Get('downloadable') @RateLimit(RateLimitCategory.PUBLIC_READ)
  getDownloadable() { return this.formsService.getDownloadable(); }
  @Public() @Get('business-permits') @RateLimit(RateLimitCategory.PUBLIC_READ)
  getBusinessPermits() { return this.formsService.getBusinessPermits(); }
  @Public() @Get('building-permits') @RateLimit(RateLimitCategory.PUBLIC_READ)
  getBuildingPermits() { return this.formsService.getBuildingPermits(); }
  @Public() @Get('zoning-clearance') @RateLimit(RateLimitCategory.PUBLIC_READ)
  getZoningClearance() { return this.formsService.getZoningClearance(); }
}
