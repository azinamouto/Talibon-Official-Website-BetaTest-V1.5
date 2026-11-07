import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
@Injectable()
export class TourismService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async getSpots() { return (await this.content.list('tourism_spots',1,100)).data; }
  async getFestivities() { return (await this.content.list('events',1,100,{category:'festivity'})).data; }
  async getDelicacies() { return this.content.pageItems('tourism-delicacies'); }
}
