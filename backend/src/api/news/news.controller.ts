import { Public } from "../../security/auth.guard";
import { Controller, Get, Inject } from "@nestjs/common";
import { NewsService } from "./news.service";

@Controller("api/news")
export class NewsController {
  constructor(@Inject(NewsService) private readonly newsService: NewsService) {}

  @Public()
  @Get("articles")
  getArticles() {
    return this.newsService.getArticles();
  }

  @Public()
  @Get("advisories")
  getAdvisories() {
    return this.newsService.getAdvisories();
  }

  @Public()
  @Get("disaster-preparedness")
  getDisasterPreparedness() {
    return this.newsService.getDisasterPreparedness();
  }

  @Public()
  @Get("updates")
  getUpdates() {
    return this.newsService.getUpdates();
  }

  @Public()
  @Get("gallery")
  getGallery() {
    return this.newsService.getGallery();
  }

  @Public()
  @Get("community")
  getCommunity() {
    return this.newsService.getCommunity();
  }

  @Public()
  @Get("public-notices")
  getPublicNotices() {
    return this.newsService.getPublicNotices();
  }

  @Public()
  @Get("downloadable")
  getDownloadable() {
    return this.newsService.getDownloadableForms();
  }
}
