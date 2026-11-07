import { Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
import { MediaService } from '../media/media.service';
@Injectable()
export class NewsService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService,
    @Inject(MediaService) private readonly media: MediaService) {}
  async getArticles() { return (await this.content.list('news',1,100,{category:'ARTICLE'})).data; }
  async getUpdates() { return (await this.content.list('news',1,100,{category:'UPDATE'})).data; }
  async getAdvisories() { return (await this.content.list('news',1,100,{category:'ADVISORY'})).data; }
  async getPublicNotices() { return (await this.content.list('news',1,100,{category:'NOTICE'})).data; }
  async getDisasterPreparedness() { return (await this.content.list('pages',1,1,{slug:'news-disaster-preparedness'})).data[0] ?? {}; }
  async getCommunity() { return (await this.content.list('pages',1,1,{slug:'news-community'})).data[0] ?? {}; }
  async getGallery() { return (await this.media.listPublic('photo',1)).data; }
  async getDownloadableForms() { return (await this.media.listPublic('document',1)).data; }
}
