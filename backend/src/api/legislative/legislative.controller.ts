import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { LegislativeService } from "./legislative.service";

@Controller("api/legislative")
export class LegislativeController {
  constructor(@Inject(LegislativeService) private readonly legislativeService: LegislativeService) {}

  @Public()
  @Get("mandate")
  getMandate() {
    return this.legislativeService.getMandate();
  }

  @Public()
  @Get("structure")
  getStructure() {
    return this.legislativeService.getStructure();
  }

  @Public()
  @Get("ordinances")
  getOrdinances() {
    return this.legislativeService.getOrdinances();
  }

  @Public()
  @Get("resolutions")
  getResolutions() {
    return this.legislativeService.getResolutions();
  }
}
