import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { NewsService } from "./news.service";

@Controller("api/news")
export class NewsController {
  constructor(@Inject(NewsService) private readonly newsService: NewsService) {}

  @Public()
  @Get("articles")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getArticles() {
    return this.newsService.getArticles();
  }

  @Public()
  @Get("advisories")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getAdvisories() {
    return this.newsService.getAdvisories();
  }

  @Public()
  @Get("disaster-preparedness")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getDisasterPreparedness() {
    return this.newsService.getDisasterPreparedness();
  }

  @Public()
  @Get("updates")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getUpdates() {
    return this.newsService.getUpdates();
  }

  @Public()
  @Get("gallery")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getGallery() {
    return this.newsService.getGallery();
  }

  @Public()
  @Get("community")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'object', additionalProperties: true, example: {} } })
  getCommunity() {
    return this.newsService.getCommunity();
  }

  @Public()
  @Get("public-notices")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getPublicNotices() {
    return this.newsService.getPublicNotices();
  }

  @Public()
  @Get("downloadable")
  @ApiOkResponse({ description: 'Approved published content; empty when unavailable for publication.', schema: { type: 'array', items: { type: 'object', additionalProperties: true }, example: [] } })
  getDownloadable() {
    return this.newsService.getDownloadableForms();
  }
}
