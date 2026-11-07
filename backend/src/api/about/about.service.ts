import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class AboutService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getProfile() { return (await this.content.list('pages',1,1,{ slug: 'about-profile' })).data[0] ?? {}; }
  async getSeal() { return (await this.content.list('pages',1,1,{ slug: 'about-seal' })).data[0] ?? {}; }
  async getHistory() { return (await this.content.list('pages',1,1,{ slug: 'about-history' })).data[0] ?? {}; }
  async getMayors() { return (await this.content.list('officials',1,100)).data; }
  async getDepartments() { return (await this.content.list('departments',1,100)).data; }
  async getVicinityMap() { return (await this.content.list('pages',1,1,{ slug: 'about-vicinity-map' })).data[0] ?? {}; }
  async getBarangays() { return (await this.content.list('barangays',1,100)).data.map(row => row.name || row.title); }
  async getIndustry() { return (await this.content.list('pages',1,1,{ slug: 'about-industry' })).data[0] ?? {}; }
  async getServices() { return (await this.content.list('services_cms',1,100)).data; }
  async getHymn() { return (await this.content.list('pages',1,1,{ slug: 'about-hymn' })).data[0] ?? {}; }
  async getDemographics() { return (await this.content.list('pages',1,1,{ slug: 'about-demographics' })).data[0] ?? {}; }
  async getLocation() { return (await this.content.list('pages',1,1,{ slug: 'about-location' })).data[0] ?? {}; }
}
