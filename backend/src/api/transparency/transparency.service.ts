import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class TransparencyService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getCitizenCharter() { return (await this.content.list('pages',1,1,{ slug: 'transparency-citizen-charter' })).data[0] ?? {}; }
  private async reports(category: string,legacy: string) { return [...(await this.content.list('transparency_reports',1,100,{category})).data,...await this.content.pageItems(legacy)]; }
  async getFullDisclosure() { return { ...(await this.content.list('pages',1,1,{ slug: 'transparency-full-disclosure' })).data[0],documents:await this.reports('full-disclosure','transparency-full-disclosure') }; }
  async getInfrastructure() { return this.reports('infrastructure','transparency-infrastructure'); }
  async getFinanceReports() { return this.reports('finance','transparency-finance-reports'); }
  async getExecutiveOrders() { return this.reports('executive-order','transparency-executive-orders'); }
  async getBudget() {
    const legacy=(await this.content.list('pages',1,1,{ slug: 'transparency-budget' })).data[0] ?? {};
    return {...legacy,documents:[...(await this.content.list('transparency_reports',1,100,{category:'budget'})).data,...(Array.isArray(legacy.documents)?legacy.documents:[])]};
  }
  async getBayanihanGrant() { return (await this.content.list('pages',1,1,{ slug: 'transparency-bayanihan-grant' })).data[0] ?? {}; }
  async getBiddings() { return this.reports('bidding','transparency-biddings'); }
  async getOrdinances() { return this.content.pageItems('transparency-ordinances'); }
  async getSroi() { return (await this.content.list('pages',1,1,{ slug: 'transparency-sroi' })).data[0] ?? {}; }
}
