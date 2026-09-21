import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { TourismService } from "./tourism.service";

@Controller("api/tourism")
export class TourismController {
  constructor(@Inject(TourismService) private readonly tourismService: TourismService) {}

  @Public()
  @Get("spots")
  getSpots() {
    return this.tourismService.getSpots();
  }

  @Public()
  @Get("festivities")
  getFestivities() {
    return this.tourismService.getFestivities();
  }

  @Public()
  @Get("delicacies")
  getDelicacies() {
    return this.tourismService.getDelicacies();
  }
}
