# SEO Guide

## Overview

This guide provides SEO (Search Engine Optimization) strategies and best practices for TAL.GOV to ensure high visibility in search engines.

## SEO Objectives

- **Visibility**: Appear prominently in search results for relevant queries
- **Traffic**: Drive organic traffic to the platform
- **Local Presence**: Dominate local search results for Talibon-related queries
- **User Experience**: Provide valuable, search-friendly content
- **Authority**: Establish as authoritative source for municipal information

## Keyword Strategy

### Primary Keywords

Focus on keywords citizens use when searching for municipal services:

- "Talibon municipal services"
- "Talibon business permit"
- "Talibon mayor's office"
- "Talibon government"
- "Bohol municipal services"

### Long-Tail Keywords

Target specific, longer search phrases:

- "How to get business permit in Talibon"
- "Talibon municipal health office contact"
- "Talibon barangay requirements"
- "Talibon tourism information"
- "Talibon emergency numbers"

### Local Keywords

Emphasize local search terms:

- "Talibon Bohol"
- "Municipality of Talibon"
- "Talibon LGU"
- "Talibon services"
- Local barangay names

## On-Page SEO

### Title Tags

Create descriptive, keyword-rich title tags:

```html
<!-- Good -->
<title>Business Permit Application - Municipality of Talibon</title>

<!-- Bad -->
<title>Services</title>
```

**Best Practices**:
- Length: 50-60 characters
- Include primary keyword
- Include location (Talibon)
- Unique for each page
- Brand at end if space allows

### Meta Descriptions

Write compelling meta descriptions:

```html
<meta name="description" content="Apply for business permits in Talibon, Bohol. Learn about requirements, fees, processing time, and office location.">
```

**Best Practices**:
- Length: 150-160 characters
- Include keywords naturally
- Compelling call-to-action
- Unique for each page
- Accurate page description

### Heading Structure

Use proper heading hierarchy:

```html
<h1>Business Permit Application</h1>
<h2>Requirements</h2>
<h3>Documents Needed</h3>
<h2>Fees</h2>
<h2>Processing Time</h2>
```

**Best Practices**:
- One H1 per page
- Include keywords in headings
- Logical hierarchy (H1 → H2 → H3)
- Don't skip levels
- Descriptive headings

### URL Structure

Create clean, keyword-rich URLs:

```
Good:
https://talibon.gov.ph/services/business-permit
https://talibon.gov.ph/departments/health-office
https://talibon.gov.ph/news/mayor-announces-project

Bad:
https://talibon.gov.ph/service?id=123
https://talibon.gov.ph/page?p=about
```

**Best Practices**:
- Lowercase letters
- Hyphens between words
- Short and descriptive
- Include keywords
- No special characters
- No parameters when possible

### Content Optimization

#### Keyword Placement

Place keywords strategically:

- Title tag
- Meta description
- H1 heading
- First paragraph
- Subheadings
- Image alt text
- URL slug
- Naturally throughout content

#### Content Quality

- **Length**: 300+ words for service pages
- **Value**: Provide comprehensive information
- **Original**: Unique content, not copied
- **Updated**: Keep information current
- **Readable**: Clear, simple language

#### Internal Linking

Link to related content:

```html
<p>For business permits, see our <a href="/services/business-permit">Business Permit Guide</a>.</p>
<p>Contact the <a href="/departments/health-office">Municipal Health Office</a> for health-related services.</p>
```

**Best Practices**:
- Descriptive anchor text
- Link to relevant pages
- Don't over-link
- Fix broken links
- Create content hubs

## Technical SEO

### Sitemap

Create and submit XML sitemap:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://talibon.gov.ph/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://talibon.gov.ph/services</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Robots.txt

Control crawler access:

```txt
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /api/
Disallow: /private/

Sitemap: https://talibon.gov.ph/sitemap.xml
```

### Canonical URLs

Prevent duplicate content:

```html
<link rel="canonical" href="https://talibon.gov.ph/services/business-permit">
```

### Meta Tags

#### Essential Meta Tags

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="...">
<meta name="keywords" content="...">
<meta name="author" content="Municipality of Talibon">
```

#### Open Graph Tags

```html
<meta property="og:title" content="Business Permit Application">
<meta property="og:description" content="Apply for business permits in Talibon">
<meta property="og:image" content="https://talibon.gov.ph/images/business-permit.jpg">
<meta property="og:url" content="https://talibon.gov.ph/services/business-permit">
<meta property="og:type" content="website">
```

#### Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Business Permit Application">
<meta name="twitter:description" content="Apply for business permits in Talibon">
<meta name="twitter:image" content="https://talibon.gov.ph/images/business-permit.jpg">
```

### Schema Markup

Add structured data for rich snippets:

#### Organization Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentOrganization",
  "name": "Municipality of Talibon",
  "url": "https://talibon.gov.ph",
  "logo": "https://talibon.gov.ph/logo.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Municipal Hall",
    "addressLocality": "Talibon",
    "addressRegion": "Bohol",
    "postalCode": "6325",
    "addressCountry": "PH"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+63-38-XXX-XXXX",
    "contactType": "customer service"
  }
}
</script>
```

#### Service Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentService",
  "name": "Business Permit Application",
  "description": "Apply for business permits in Talibon",
  "provider": {
    "@type": "GovernmentOrganization",
    "name": "Municipality of Talibon"
  },
  "areaServed": {
    "@type": "City",
    "name": "Talibon"
  }
}
</script>
```

## Local SEO

### Google Business Profile

Claim and optimize Google Business Profile:

- **Claim**: https://business.google.com/
- **Verify**: Verify ownership
- **Complete**: Fill all information
- **Photos**: Add office photos
- **Posts**: Regular updates
- **Reviews**: Encourage reviews
- **Q&A**: Answer questions

### Local Citations

List on local directories:

- Google Maps
- Apple Maps
- Local business directories
- Government portals
- Tourism websites

### NAP Consistency

Ensure consistent Name, Address, Phone:

- **Name**: Municipality of Talibon
- **Address**: Municipal Hall, Talibon, Bohol, 6325
- **Phone**: +63 (38) XXX-XXXX

Use exact same format everywhere.

### Local Content

Create local-focused content:

- Talibon history
- Local events
- Tourism information
- Local news
- Barangay information

## Performance and SEO

### Page Speed

Fast loading pages rank better:

- Optimize images
- Minimize JavaScript
- Use CDN
- Enable compression
- Lazy loading

### Mobile-Friendly

Mobile-first indexing:

- Responsive design
- Mobile testing
- Touch-friendly
- Readable on mobile
- Fast on mobile

### Core Web Vitals

Optimize for Core Web Vitals:

- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

## Content Strategy for SEO

### Service Pages

Create comprehensive service pages:

- Detailed requirements
- Step-by-step process
- Fee information
- Processing time
- Office location
- Contact information
- FAQ section

### Blog/News

Regular content updates:

- Municipal news
- Project updates
- Event announcements
- Service reminders
- Seasonal information

### FAQ Pages

Answer common questions:

- Service-related questions
- Process questions
- Fee questions
- Document questions
- Contact questions

## Link Building

### Internal Links

- Link between related services
- Link services to departments
- Link news to services
- Create content hubs
- Breadcrumb navigation

### External Links

- Link to official government sites
- Link to related resources
- Link to partner agencies
- Citations and references

### Backlinks

Earn quality backlinks:

- Government portals
- News websites
- Tourism sites
- Educational institutions
- Local directories

## Monitoring and Analytics

### Google Search Console

Monitor search performance:

- Submit sitemap
- Monitor indexing
- Check for errors
- View search analytics
- Disavow bad links

### Google Analytics

Track user behavior:

- Organic traffic
- Search terms
- Landing pages
- User engagement
- Conversion rates

### Rank Tracking

Monitor keyword rankings:

- Primary keywords
- Local keywords
- Competitor rankings
- Ranking changes

## SEO Checklist

### On-Page

- [ ] Title tags optimized
- [ ] Meta descriptions written
- [ ] Heading structure correct
- [ ] URLs clean and descriptive
- [ ] Content optimized for keywords
- [ ] Internal links added
- [ ] Images have alt text
- [ ] Schema markup added

### Technical

- [ ] Sitemap created and submitted
- [ ] Robots.txt configured
- [ ] Canonical tags set
- [ ] Page speed optimized
- [ ] Mobile-friendly
- [ ] HTTPS enabled
- [ ] No broken links
- [ ] No duplicate content

### Local

- [ ] Google Business Profile claimed
- [ ] NAP consistent
- [ ] Local citations created
- [ ] Reviews encouraged
- [ ] Local content created

### Ongoing

- [ ] Monthly: Review rankings
- [ ] Monthly: Check analytics
- [ ] Monthly: Update content
- [ ] Quarterly: Competitor analysis
- [ ] Annually: Full SEO audit

## Common SEO Mistakes

### Avoid These

- Keyword stuffing
- Duplicate content
- Hidden text
- Cloaking
- Buying links
- Ignoring mobile
- Slow page speed
- Poor user experience
- Broken links
- Thin content

## SEO Tools

### Free Tools

- Google Search Console
- Google Analytics
- Google PageSpeed Insights
- Google Keyword Planner
- Screaming Frog SEO Spider
- Yoast SEO (if using WordPress)

### Paid Tools

- SEMrush
- Ahrefs
- Moz Pro
- Screaming Frog (paid version)

## References

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Moz SEO Guide](https://moz.com/beginners-guide-to-seo)
- [Content Strategy Guide](CONTENT_STRATEGY.md)
