import { CmsContentController } from './api/content/cms.controller';
import { PublicFormsController } from './api/forms/public-forms.controller';
import { MediaController, PublicMediaController } from './api/media/media.controller';
import { MediaService } from './api/media/media.service';
import { Module, MiddlewareConsumer, NestModule, RequestMethod } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { AuditMiddleware } from "./security/audit.middleware";
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';

import { AboutController } from "./api/about/about.controller";
import { AboutService } from "./api/about/about.service";
import { ExecutiveController } from "./api/executive/executive.controller";
import { ExecutiveService } from "./api/executive/executive.service";
import { LegislativeController } from "./api/legislative/legislative.controller";
import { LegislativeService } from "./api/legislative/legislative.service";
import { NewsController } from "./api/news/news.controller";
import { NewsService } from "./api/news/news.service";
import { TransparencyController } from "./api/transparency/transparency.controller";
import { TransparencyService } from "./api/transparency/transparency.service";
import { TourismController } from "./api/tourism/tourism.controller";
import { TourismService } from "./api/tourism/tourism.service";
import { PublicContentService } from './database/public-content.service';
import { PublicCatalogController } from './api/content/public-catalog.controller';
import { RateLimiterGuard } from "./security/rate-limiter.guard";
import { StaffGuard } from "./authentication/staff.guard";
import { CacheControlMiddleware } from "./security/cache-control.middleware";
import { AllExceptionsFilter } from "./security/all-exceptions.filter";
import { ContentService } from './api/content/content.service';
import { PageContentController } from './api/content/pages.controller';
import { NewsContentController } from './api/content/news.controller';
import { ServiceContentController } from './api/content/services.controller';
import { SearchController } from './api/search/search.controller';
import { SearchService } from './api/search/search.service';
import { HealthController } from './api/health/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['backend/.env', '.env'], validate: validateEnvironment })],
  controllers: [
    CmsContentController, MediaController, PublicMediaController, PublicCatalogController,
    HealthController,
    PublicFormsController,
    SearchController,
    AboutController,
    ExecutiveController,
    LegislativeController,
    NewsController,
    PageContentController,
    NewsContentController,
    ServiceContentController,
    TransparencyController,
    TourismController,
  ],
  providers: [
    MediaService,
    SearchService,
    PublicContentService,
    AboutService,
    ExecutiveService,
    LegislativeService,
    NewsService,
    ContentService,
    TransparencyService,
    TourismService,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard
    },
    {
      provide: APP_GUARD,
      useClass: StaffGuard
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security headers & cache control to all routes
    consumer
      .apply(CacheControlMiddleware, AuditMiddleware)
      .forRoutes({ path: "{*path}", method: RequestMethod.ALL });
  }
}
