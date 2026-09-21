import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { TransparencyService } from "./transparency.service";

@Controller("api/transparency")
export class TransparencyController {
  constructor(@Inject(TransparencyService) private readonly transparencyService: TransparencyService) {}

  @Public()
  @Get("citizen-charter")
  getCitizenCharter() {
    return this.transparencyService.getCitizenCharter();
  }

  @Public()
  @Get("full-disclosure")
  getFullDisclosure() {
    return this.transparencyService.getFullDisclosure();
  }

  @Public()
  @Get("infrastructure")
  getInfrastructure() {
    return this.transparencyService.getInfrastructure();
  }

  @Public()
  @Get("finance-reports")
  getFinanceReports() {
    return this.transparencyService.getFinanceReports();
  }

  @Public()
  @Get("executive-orders")
  getExecutiveOrders() {
    return this.transparencyService.getExecutiveOrders();
  }

  @Public()
  @Get("budget")
  getBudget() {
    return this.transparencyService.getBudget();
  }

  @Public()
  @Get("bayanihan-grant")
  getBayanihanGrant() {
    return this.transparencyService.getBayanihanGrant();
  }

  @Public()
  @Get("biddings")
  getBiddings() {
    return this.transparencyService.getBiddings();
  }

  @Public()
  @Get("ordinances")
  getOrdinances() {
    return this.transparencyService.getOrdinances();
  }

  @Public()
  @Get("sroi")
  getSroi() {
    return this.transparencyService.getSroi();
  }
}
