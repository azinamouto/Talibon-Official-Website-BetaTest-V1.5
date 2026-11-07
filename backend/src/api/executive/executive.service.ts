import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class ExecutiveService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getMandate() { return (await this.content.list('pages',1,1,{ slug: 'executive-mandate' })).data[0] ?? {}; }
  async getVisionMission() { return (await this.content.list('pages',1,1,{ slug: 'executive-vision-mission' })).data[0] ?? {}; }
  async getChart() { return (await this.content.list('pages',1,1,{ slug: 'executive-chart' })).data[0] ?? {}; }
  async getDirectory() { return this.content.pageItems('executive-directory'); }
  async getGadIms() { return (await this.content.list('pages',1,1,{ slug: 'executive-gad-ims' })).data[0] ?? {}; }
}
