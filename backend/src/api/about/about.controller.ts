import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { AboutService } from "./about.service";

@Controller("api/about")
export class AboutController {
  constructor(@Inject(AboutService) private readonly aboutService: AboutService) {}

  @Public()
  @Get("profile")
  getProfile() {
    return this.aboutService.getProfile();
  }

  @Public()
  @Get("seal")
  getSeal() {
    return this.aboutService.getSeal();
  }

  @Public()
  @Get("history")
  getHistory() {
    return this.aboutService.getHistory();
  }

  @Public()
  @Get("mayors")
  getMayors() {
    return this.aboutService.getMayors();
  }

  @Public()
  @Get("departments")
  getDepartments() {
    return this.aboutService.getDepartments();
  }

  @Public()
  @Get("vicinity-map")
  getVicinityMap() {
    return this.aboutService.getVicinityMap();
  }

  @Public()
  @Get("barangays")
  getBarangays() {
    return this.aboutService.getBarangays();
  }

  @Public()
  @Get("industry")
  getIndustry() {
    return this.aboutService.getIndustry();
  }

  @Public()
  @Get("services")
  getServices() {
    return this.aboutService.getServices();
  }

  @Public()
  @Get("hymn")
  getHymn() {
    return this.aboutService.getHymn();
  }

  @Public()
  @Get("demographics")
  getDemographics() {
    return this.aboutService.getDemographics();
  }

  @Public()
  @Get("location")
  getLocation() {
    return this.aboutService.getLocation();
  }
}
