import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class LegislativeService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getMandate() { return (await this.content.list('pages',1,1,{ slug: 'legislative-mandate' })).data[0] ?? {}; }
  async getStructure() { return (await this.content.list('pages',1,1,{ slug: 'legislative-structure' })).data[0] ?? {}; }
  async getOrdinances() { return (await this.content.list('ordinances',1,100)).data; }
  async getResolutions() { return (await this.content.list('resolutions',1,100)).data; }
}
