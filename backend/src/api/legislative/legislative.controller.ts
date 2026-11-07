import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { LegislativeService } from "./legislative.service";

@Controller("api/legislative")
export class LegislativeController {
  constructor(@Inject(LegislativeService) private readonly legislativeService: LegislativeService) {}

  @Public()
  @Get("mandate")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getMandate() {
    return this.legislativeService.getMandate();
  }

  @Public()
  @Get("structure")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getStructure() {
    return this.legislativeService.getStructure();
  }

  @Public()
  @Get("ordinances")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getOrdinances() {
    return this.legislativeService.getOrdinances();
  }

  @Public()
  @Get("resolutions")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getResolutions() {
    return this.legislativeService.getResolutions();
  }
}
