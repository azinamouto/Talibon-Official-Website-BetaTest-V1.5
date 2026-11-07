import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class TransparencyService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getCitizenCharter() { return (await this.content.list('pages',1,1,{ slug: 'transparency-citizen-charter' })).data[0] ?? {}; }
  async getFullDisclosure() { return (await this.content.list('pages',1,1,{ slug: 'transparency-full-disclosure' })).data[0] ?? {}; }
  async getInfrastructure() { return this.content.pageItems('transparency-infrastructure'); }
  async getFinanceReports() { return this.content.pageItems('transparency-finance-reports'); }
  async getExecutiveOrders() { return this.content.pageItems('transparency-executive-orders'); }
  async getBudget() { return (await this.content.list('pages',1,1,{ slug: 'transparency-budget' })).data[0] ?? {}; }
  async getBayanihanGrant() { return (await this.content.list('pages',1,1,{ slug: 'transparency-bayanihan-grant' })).data[0] ?? {}; }
  async getBiddings() { return this.content.pageItems('transparency-biddings'); }
  async getOrdinances() { return this.content.pageItems('transparency-ordinances'); }
  async getSroi() { return (await this.content.list('pages',1,1,{ slug: 'transparency-sroi' })).data[0] ?? {}; }
}
