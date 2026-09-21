import { Module, MiddlewareConsumer, NestModule, RequestMethod } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { AuditMiddleware } from "./security/audit.middleware";
import { AuthModule } from "./api/auth/auth.module";
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
import { FormsController } from "./api/forms/forms.controller";
import { FormsService } from "./api/forms/forms.service";
import { PaymentsModule } from "./api/payments/payments.module";
import { NotificationsModule } from "./api/notifications/notification.module";
import { SupabaseService } from "./supabase.service";
import { RateLimiterGuard } from "./security/rate-limiter.guard";
import { AuthGuard } from "./security/auth.guard";
import { CacheControlMiddleware } from "./security/cache-control.middleware";
import { AllExceptionsFilter } from "./security/all-exceptions.filter";
import { ContentService } from './api/content/content.service';
import { PageContentController } from './api/content/pages.controller';
import { NewsContentController } from './api/content/news.controller';
import { ServiceContentController } from './api/content/services.controller';
import { ReportsController } from './api/admin/reports.controller';
import { ReportsService } from './api/admin/reports.service';
import { UsersController } from './api/admin/users.controller';
import { UsersService } from './api/admin/users.service';
import { SearchController } from './api/search/search.controller';
import { SearchService } from './api/search/search.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['backend/.env', '.env'], validate: validateEnvironment }), AuthModule, PaymentsModule, NotificationsModule],
  controllers: [
    SearchController,
    ReportsController,
    UsersController,
    AboutController,
    ExecutiveController,
    LegislativeController,
    NewsController,
    PageContentController,
    NewsContentController,
    ServiceContentController,
    TransparencyController,
    TourismController,
    FormsController,
  ],
  providers: [
    SearchService,
    ReportsService,
    UsersService,
    SupabaseService,
    AboutService,
    ExecutiveService,
    LegislativeService,
    NewsService,
    ContentService,
    TransparencyService,
    TourismService,
    FormsService,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard
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
      .apply(SecurityHeadersMiddleware, CacheControlMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
