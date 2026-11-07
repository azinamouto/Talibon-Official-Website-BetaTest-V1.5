import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { ExecutiveService } from "./executive.service";

@Controller("api/executive")
export class ExecutiveController {
  constructor(@Inject(ExecutiveService) private readonly executiveService: ExecutiveService) {}

  @Public()
  @Get("mandate")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getMandate() {
    return this.executiveService.getMandate();
  }

  @Public()
  @Get("vision-mission")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getVisionMission() {
    return this.executiveService.getVisionMission();
  }

  @Public()
  @Get("chart")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getChart() {
    return this.executiveService.getChart();
  }

  @Public()
  @Get("directory")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getDirectory() {
    return this.executiveService.getDirectory();
  }

  @Public()
  @Get("gad-ims")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getGadIms() {
    return this.executiveService.getGadIms();
  }
}
