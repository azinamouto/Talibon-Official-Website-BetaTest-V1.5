import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { ExecutiveService } from "./executive.service";

@Controller("api/executive")
export class ExecutiveController {
  constructor(@Inject(ExecutiveService) private readonly executiveService: ExecutiveService) {}

  @Public()
  @Get("mandate")
  getMandate() {
    return this.executiveService.getMandate();
  }

  @Public()
  @Get("vision-mission")
  getVisionMission() {
    return this.executiveService.getVisionMission();
  }

  @Public()
  @Get("chart")
  getChart() {
    return this.executiveService.getChart();
  }

  @Public()
  @Get("directory")
  getDirectory() {
    return this.executiveService.getDirectory();
  }

  @Public()
  @Get("gad-ims")
  getGadIms() {
    return this.executiveService.getGadIms();
  }
}
