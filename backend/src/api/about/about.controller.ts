import { AboutResponse } from "./about.openapi";
import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { AboutService } from "./about.service";

@Controller("api/about")
export class AboutController {
  constructor(@Inject(AboutService) private readonly aboutService: AboutService) {}

  @Public()
  @Get("profile")
  @AboutResponse("profile")
  getProfile() {
    return this.aboutService.getProfile();
  }

  @Public()
  @Get("seal")
  @AboutResponse("seal")
  getSeal() {
    return this.aboutService.getSeal();
  }

  @Public()
  @Get("history")
  @AboutResponse("history")
  getHistory() {
    return this.aboutService.getHistory();
  }

  @Public()
  @Get("mayors")
  @AboutResponse("mayors")
  getMayors() {
    return this.aboutService.getMayors();
  }

  @Public()
  @Get("departments")
  @AboutResponse("departments")
  getDepartments() {
    return this.aboutService.getDepartments();
  }

  @Public()
  @Get("vicinity-map")
  @AboutResponse("vicinity-map")
  getVicinityMap() {
    return this.aboutService.getVicinityMap();
  }

  @Public()
  @Get("barangays")
  @AboutResponse("barangays")
  getBarangays() {
    return this.aboutService.getBarangays();
  }

  @Public()
  @Get("industry")
  @AboutResponse("industry")
  getIndustry() {
    return this.aboutService.getIndustry();
  }

  @Public()
  @Get("services")
  @ApiOkResponse({ description: 'Legacy municipal-services feed. New public UI uses GET /api/services for publication filtering.', schema: {
    type: 'array', items: { type: 'object', required: ['name', 'description'], properties: { name: { type: 'string' }, description: { type: 'string' } }, additionalProperties: true },
    example: [{ name: 'Municipal information', description: 'Service details.' }],
  } })
  getServices() {
    return this.aboutService.getServices();
  }

  @Public()
  @Get("hymn")
  @AboutResponse("hymn")
  getHymn() {
    return this.aboutService.getHymn();
  }

  @Public()
  @Get("demographics")
  @AboutResponse("demographics")
  getDemographics() {
    return this.aboutService.getDemographics();
  }

  @Public()
  @Get("location")
  @AboutResponse("location")
  getLocation() {
    return this.aboutService.getLocation();
  }
}
