import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { TransparencyService } from "./transparency.service";

@Controller("api/transparency")
export class TransparencyController {
  constructor(@Inject(TransparencyService) private readonly transparencyService: TransparencyService) {}

  @Public()
  @Get("citizen-charter")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getCitizenCharter() {
    return this.transparencyService.getCitizenCharter();
  }

  @Public()
  @Get("full-disclosure")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getFullDisclosure() {
    return this.transparencyService.getFullDisclosure();
  }

  @Public()
  @Get("infrastructure")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getInfrastructure() {
    return this.transparencyService.getInfrastructure();
  }

  @Public()
  @Get("finance-reports")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getFinanceReports() {
    return this.transparencyService.getFinanceReports();
  }

  @Public()
  @Get("executive-orders")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getExecutiveOrders() {
    return this.transparencyService.getExecutiveOrders();
  }

  @Public()
  @Get("budget")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getBudget() {
    return this.transparencyService.getBudget();
  }

  @Public()
  @Get("bayanihan-grant")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getBayanihanGrant() {
    return this.transparencyService.getBayanihanGrant();
  }

  @Public()
  @Get("biddings")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getBiddings() {
    return this.transparencyService.getBiddings();
  }

  @Public()
  @Get("ordinances")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getOrdinances() {
    return this.transparencyService.getOrdinances();
  }

  @Public()
  @Get("sroi")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getSroi() {
    return this.transparencyService.getSroi();
  }
}
