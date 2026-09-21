import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Inject,
  BadRequestException,
  UseGuards
} from "@nestjs/common";
import { FormsService } from "./forms.service";
import { CreateCertificateRequestDto } from "./dto/certificate-request.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { RateLimit, RateLimitCategory } from "../../security/rate-limiter.guard";
import { Public, Roles, RequireAuth } from "../../security/auth.guard";
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller("api/forms")
export class FormsController {
  constructor(@Inject(FormsService) private readonly formsService: FormsService) {}

  @Get("certificate")
  @ApiBearerAuth()
  @RateLimit(RateLimitCategory.ADMIN_MUTATION)
  @RequireAuth()
  @Roles("admin", "super_admin", "municipal_admin", "staff")
  async getAllRequests() {
    return this.formsService.getAllRequests();
  }

  @Public()
  @Post("certificate")
  @RateLimit(RateLimitCategory.CITIZEN_SUBMISSION)
  async submitRequest(@Body() dto: CreateCertificateRequestDto) {
    return this.formsService.submitRequest(dto);
  }

  @Public()
  @Get("certificate/:ticketId")
  @RateLimit(RateLimitCategory.TRACKING)
  async getRequestStatus(@Param("ticketId") ticketId: string) {
    const sanitized = ticketId ? ticketId.trim() : "";
    if (!sanitized || sanitized.length > 100) {
      throw new BadRequestException("Invalid ticket ID provided.");
    }
    const request = await this.formsService.getRequestStatus(sanitized);
    if (!request) {
      return { success: false, message: "Ticket ID or tracking code not found." };
    }
    // Tracking is public: expose progress only, never applicant/contact/attachment data.
    return { success: true, request: {
      ticketId: request.ticketId, documentType: request.documentType,
      status: request.status, submittedAt: request.submittedAt,
      history: request.history?.map(({ status, createdAt }) => ({ status, createdAt })),
    } };
  }

  @Put("certificate/:id/status")
  @ApiBearerAuth()
  @RateLimit(RateLimitCategory.ADMIN_MUTATION)
  @RequireAuth()
  @Roles("admin", "super_admin", "municipal_admin", "staff")
  async updateRequestStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto
  ) {
    if (!id || id.length > 100) {
      throw new BadRequestException("Invalid request ID.");
    }
    console.log(`[FORMS_API] Request received: PUT /api/forms/certificate/${id}/status -> Target Status: "${dto.status}", notifyEmail: ${dto.notifyEmail !== false}, notifyCitizen: ${dto.notifyCitizen !== false}`);
    const success = await this.formsService.updateRequestStatus(
      id,
      dto.status,
      dto.remarks || "",
      dto.notifyCitizen !== false,
      dto.saveTimeline !== false,
      dto.notifyEmail !== false,
      dto.requirements
    );
    console.log(`[FORMS_API] Status transition completed for request ID ${id}. Result: ${success ? "SUCCESS" : "FAILED"}`);
    return { success, notificationQueued: true };
  }

  @Public()
  @Get("downloadable")
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  getDownloadable() {
    return this.formsService.getDownloadable();
  }

  @Public()
  @Get("business-permits")
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  getBusinessPermits() {
    return this.formsService.getBusinessPermits();
  }

  @Public()
  @Get("building-permits")
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  getBuildingPermits() {
    return this.formsService.getBuildingPermits();
  }

  @Public()
  @Get("zoning-clearance")
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  getZoningClearance() {
    return this.formsService.getZoningClearance();
  }
}
