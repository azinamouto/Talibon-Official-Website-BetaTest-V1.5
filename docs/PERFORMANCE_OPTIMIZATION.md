# Performance Optimization Guide

## Overview

This guide covers performance optimization strategies for TAL.GOV, ensuring fast and responsive experience for citizens and staff.

## Performance Goals

### Core Web Vitals

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| LCP (Largest Contentful Paint) | < 2.5s | < 2.5s | > 4.0s |
| FID (First Input Delay) | < 100ms | < 100ms | > 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.1 | > 0.25 |

### Additional Metrics

- First Contentful Paint (FCP): < 1.8s
- Time to Interactive (TTI): < 3.8s
- Speed Index: < 3.4s
- Time to First Byte (TTFB): < 600ms

## Frontend Optimization

### Code Splitting

Split code into smaller chunks to reduce initial load time.

```typescript
// Route-based code splitting
import { lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const Admin = lazy(() => import('./pages/Admin'));

// Suspense wrapper
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/services" element={<Services />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
</Suspense>
```

### Lazy Loading

Load components only when needed.

```typescript
// Lazy load heavy components
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
const ImageGallery = lazy(() => import('./components/ImageGallery'));
```

### Tree Shaking

Remove unused code from production builds.

```typescript
// Import only what you need
import { debounce } from 'lodash-es'; // instead of 'lodash'
import { format } from 'date-fns'; // instead of moment
```

### Bundle Size Optimization

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Webpack Bundle Analyzer
npm install --save-dev @rollup/plugin-visualizer
```

### Image Optimization

```typescript
// Use next-gen formats
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="Description" loading="lazy" />
</picture>

// Responsive images
<img
  srcSet="image-small.jpg 480w,
          image-medium.jpg 800w,
          image-large.jpg 1200w"
  sizes="(max-width: 600px) 480px,
         (max-width: 900px) 800px,
         1200px"
  src="image-medium.jpg"
  alt="Description"
/>
```

### Font Optimization

```css
/* Font display strategy */
@font-face {
  font-family: 'Custom Font';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Prevent FOIT */
}

/* Subset fonts to reduce size */
@font-face {
  font-family: 'Custom Font';
  src: url('font-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF; /* Latin only */
}
```

### CSS Optimization

```css
/* Critical CSS inline */
/* Load non-critical CSS asynchronously */

/* Avoid excessive specificity */
.button-primary { /* instead of .container .header .nav .button-primary */ }

/* Minify CSS in production */
```

## Backend Optimization

### Database Optimization

#### Indexing

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_news_published ON news(is_published, published_at);
CREATE INDEX idx_users_email ON users(email);

-- Composite indexes for complex queries
CREATE INDEX idx_services_department_active ON services(department_id, is_active);
```

#### Query Optimization

```typescript
// Use select instead of *
// Bad
const users = await this.userRepository.find();

// Good
const users = await this.userRepository.find({
  select: ['id', 'email', 'firstName', 'lastName']
});

// Use pagination
const services = await this.serviceRepository.find({
  skip: 0,
  take: 20
});

// Use joins efficiently
const services = await this.serviceRepository
  .createQueryBuilder('service')
  .leftJoinAndSelect('service.department', 'department')
  .where('service.isActive = :active', { active: true })
  .getMany();
```

#### Connection Pooling

```typescript
// Configure connection pool
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    max: 20, // Maximum pool size
    min: 5,  // Minimum pool size
    idleTimeoutMillis: 30000
  }
}
```

### Caching Strategy

#### HTTP Caching

```typescript
// Set cache headers
@Get('/services')
@Header('Cache-Control', 'public, max-age=3600') // 1 hour
async getServices() {
  return this.servicesService.findAll();
}
```

#### Application Caching

```typescript
// Use Redis for caching
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('services')
@UseInterceptors(CacheInterceptor)
export class ServicesController {
  @CacheTTL(60) // Cache for 60 seconds
  @Get()
  findAll() {
    return this.servicesService.findAll();
  }
}
```

### API Response Optimization

```typescript
// Use pagination
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20
) {
  return this.servicesService.findAll({
    skip: (page - 1) * limit,
    take: limit
  });
}

// Use field selection
@Get()
async findAll(@Query('fields') fields?: string) {
  return this.servicesService.findAll({
    select: fields ? fields.split(',') : undefined
  });
}

// Compress responses
import compression from 'compression';
app.use(compression());
```

## Network Optimization

### CDN Usage

- Serve static assets through CDN
- Enable gzip/brotli compression
- Use HTTP/2 or HTTP/3

### Resource Hints

```html
<!-- Preconnect to important origins -->
<link rel="preconnect" href="https://api.talibon.gov.ph">
<link rel="preconnect" href="https://cdn.supabase.co">

<!-- DNS prefetch -->
<link rel="dns-prefetch" href="https://api.talibon.gov.ph">

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/styles/main.css" as="style">

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/services">
```

### Lazy Loading Resources

```typescript
// Lazy load images
<img src="placeholder.jpg" data-src="actual.jpg" loading="lazy" class="lazyload" />

// Lazy load videos
<video preload="none" poster="poster.jpg">
  <source data-src="video.mp4" type="video/mp4">
</video>
```

## Monitoring and Measurement

### Performance Monitoring Tools

```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# WebPageTest
# Use https://www.webpagetest.org/

# Real User Monitoring (RUM)
# Implement analytics for real user performance
```

### Custom Performance Tracking

```typescript
// Track performance metrics
export const trackPerformance = (metricName: string, value: number) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Send to analytics
    analytics.track('performance_metric', {
      metric: metricName,
      value: value,
      timestamp: Date.now()
    });
  }
};

// Track API response times
const responseTime = async (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    trackPerformance('api_response_time', duration);
  });
  next();
};
```

## Optimization Checklist

### Pre-Deployment

- [ ] Lighthouse score > 90
- [ ] Bundle size analyzed
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Database queries optimized
- [ ] Caching strategy in place
- [ ] CDN configured
- [ ] Compression enabled

### Regular Maintenance

- [ ] Monthly: Performance audit
- [ ] Quarterly: Bundle size review
- [ ] Ongoing: Monitor real user metrics
- [ ] As needed: Optimize slow pages

## Common Performance Issues

### Large Bundle Size

**Symptoms**: Slow initial load, long TTI

**Solutions**:
- Implement code splitting
- Remove unused dependencies
- Use tree shaking
- Lazy load routes

### Slow Database Queries

**Symptoms**: Slow API responses, high TTFB

**Solutions**:
- Add database indexes
- Optimize queries
- Use connection pooling
- Implement caching

### Unoptimized Images

**Symptoms**: Slow LCP, large bandwidth usage

**Solutions**:
- Use next-gen formats (WebP)
- Implement lazy loading
- Use responsive images
- Compress images

### Render Blocking Resources

**Symptoms**: Slow FCP, delayed interactivity

**Solutions**:
- Inline critical CSS
- Defer non-critical JavaScript
- Use async/defer for scripts
- Preload critical resources

## Best Practices

1. **Measure first**: Don't optimize without data
2. **Optimize for users**: Focus on real user experience
3. **Mobile first**: Many users will be on mobile devices
4. **Progressive enhancement**: Core functionality loads first
5. **Monitor continuously**: Performance can degrade over time
6. **Balance trade-offs**: Sometimes performance vs features

## References

- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse Documentation](https://github.com/GoogleChrome/lighthouse)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Optimization](https://nextjs.org/docs/advanced-features/automatic-optimization)
