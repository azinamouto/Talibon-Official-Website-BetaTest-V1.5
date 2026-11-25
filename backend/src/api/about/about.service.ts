import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
import { staticAboutPages } from './static-pages';
@Injectable()
export class AboutService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  private async page(slug: string) {
    try {
      const row = (await this.content.list('pages', 1, 1, { slug })).data[0];
      if (row) return row;
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
    }
    return structuredClone(staticAboutPages[slug]);
  }
  async getProfile() { return this.page('about-profile'); }
  async getSeal() { return this.page('about-seal'); }
  async getHistory() { return this.page('about-history'); }
  async getMayors() { return (await this.content.list('officials',1,100)).data; }
  async getDepartments() { return (await this.content.list('departments',1,100)).data; }
  async getVicinityMap() { return this.page('about-vicinity-map'); }
  async getBarangays() { return (await this.content.list('barangays',1,100)).data.map(row => row.name || row.title); }
  async getIndustry() { return (await this.content.list('pages',1,1,{ slug: 'about-industry' })).data[0] ?? {}; }
  async getServices() { return (await this.content.list('services_cms',1,100)).data; }
  async getHymn() { return this.page('about-hymn'); }
  async getDemographics() { return this.page('about-demographics'); }
  async getLocation() { return this.page('about-location'); }
}
