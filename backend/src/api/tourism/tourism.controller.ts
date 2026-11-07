import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { TourismService } from "./tourism.service";

@Controller("api/tourism")
export class TourismController {
  constructor(@Inject(TourismService) private readonly tourismService: TourismService) {}

  @Public()
  @Get("spots")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getSpots() {
    return this.tourismService.getSpots();
  }

  @Public()
  @Get("festivities")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getFestivities() {
    return this.tourismService.getFestivities();
  }

  @Public()
  @Get("delicacies")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getDelicacies() {
    return this.tourismService.getDelicacies();
  }
}
