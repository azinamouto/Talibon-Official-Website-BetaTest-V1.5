# Localization Guide

## Overview

This guide covers localization (i18n/l10n) strategies for TAL.GOV to support multiple languages and serve diverse citizen populations.

## Language Strategy

### Primary Languages

- **English**: Official language, primary content
- **Tagalog**: National language, widely understood
- **Cebuano**: Local language, widely spoken in Bohol

### Language Hierarchy

1. **English**: Official government communications
2. **Tagalog**: Accessible to national audience
3. **Cebuano**: Local relevance and cultural connection

## Implementation Approach

### i18n Framework

Use React i18next for internationalization:

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### Configuration

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import tlTranslation from './locales/tl.json';
import cbTranslation from './locales/cb.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      tl: { translation: tlTranslation },
      cb: { translation: cbTranslation }
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

## Translation Files

### File Structure

```
locales/
  en.json
  tl.json
  cb.json
```

### English (en.json)

```json
{
  "common": {
    "home": "Home",
    "about": "About",
    "services": "Services",
    "news": "News",
    "contact": "Contact",
    "search": "Search",
    "language": "Language"
  },
  "services": {
    "title": "Government Services",
    "subtitle": "Find and access municipal services",
    "viewAll": "View All Services",
    "noResults": "No services found"
  },
  "service": {
    "requirements": "Requirements",
    "fees": "Fees",
    "processingTime": "Processing Time",
    "officeLocation": "Office Location",
    "contactInfo": "Contact Information"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot Password?"
  },
  "errors": {
    "networkError": "Network error. Please check your connection.",
    "notFound": "Page not found",
    "unauthorized": "You need to login to access this page"
  }
}
```

### Tagalog (tl.json)

```json
{
  "common": {
    "home": "Home",
    "about": "Tungkol",
    "services": "Serbisyo",
    "news": "Balita",
    "contact": "Kontak",
    "search": "Maghanap",
    "language": "Wika"
  },
  "services": {
    "title": "Mga Serbisyo ng Gobyerno",
    "subtitle": "Maghanap at ma-access ang mga serbisyong munisipal",
    "viewAll": "Tingnan ang Lahat ng Serbisyo",
    "noResults": "Walang nahanap na serbisyo"
  },
  "service": {
    "requirements": "Mga Kinakailangan",
    "fees": "Bayad",
    "processingTime": "Oras ng Pagproseso",
    "officeLocation": "Lokasyon ng Opisina",
    "contactInfo": "Impormasyon sa Kontak"
  },
  "auth": {
    "login": "Mag-login",
    "logout": "Mag-logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Nakalimutan ang Password?"
  },
  "errors": {
    "networkError": "Error sa network. Paki-angkan ang iyong koneksyon.",
    "notFound": "Hindi nahanap ang pahina",
    "unauthorized": "Kailangan mong mag-login para ma-access ang pahinang ito"
  }
}
```

### Cebuano (cb.json)

```json
{
  "common": {
    "home": "Home",
    "about": "Mahitungod",
    "services": "Serbisyo",
    "news": "Balita",
    "contact": "Kontak",
    "search": "Pangita",
    "language": "Pinulongan"
  },
  "services": {
    "title": "Mga Serbisyo sa Gobyerno",
    "subtitle": "Pangita ug ma-access ang mga serbisyong munisipal",
    "viewAll": "Tan-awa ang Tanang Serbisyo",
    "noResults": "Walay nakitang serbisyo"
  },
  "service": {
    "requirements": "Mga Kinahanglan",
    "fees": "Bayad",
    "processingTime": "Oras sa Pagproseso",
    "officeLocation": "Lokasyon sa Opisina",
    "contactInfo": "Impormasyon sa Kontak"
  },
  "auth": {
    "login": "Pag-login",
    "logout": "Pag-logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Nalimtan ang Password?"
  },
  "errors": {
    "networkError": "Error sa network. Palihug sa-angkan ang imong koneksyon.",
    "notFound": "Wala mailhan ang pahina",
    "unauthorized": "Kinahanglan nimo mag-login para ma-access ang pahinang ini"
  }
}
```

## Using Translations

### Component Usage

```typescript
import { useTranslation } from 'react-i18next';

const ServiceCard = ({ service }: { service: Service }) => {
  const { t } = useTranslation();

  return (
    <div className="service-card">
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-details">
        <span>{t('service.requirements')}</span>
        <span>{t('service.fees')}</span>
        <span>{t('service.processingTime')}</span>
      </div>
    </div>
  );
};
```

### Language Switcher

```typescript
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('tl')}>Tagalog</button>
      <button onClick={() => changeLanguage('cb')}>Cebuano</button>
    </div>
  );
};
```

## Content Localization

### Service Descriptions

Translate service information:

```typescript
interface Service {
  id: string;
  name: string;
  description: {
    en: string;
    tl?: string;
    cb?: string;
  };
  requirements: {
    en: string;
    tl?: string;
    cb?: string;
  };
}

const getServiceDescription = (service: Service, language: string) => {
  return service.description[language] || service.description.en;
};
```

### Dynamic Content

```typescript
const ServiceDetail = ({ service }: { service: Service }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div>
      <h1>{service.name}</h1>
      <p>{service.description[currentLang] || service.description.en}</p>
      <h2>{t('service.requirements')}</h2>
      <p>{service.requirements[currentLang] || service.requirements.en}</p>
    </div>
  );
};
```

## Date and Number Formatting

### Date Localization

```typescript
import { format } from 'date-fns';
import { enUS, tl, cb } from 'date-fns/locale';

const formatDate = (date: Date, language: string) => {
  const locales = {
    en: enUS,
    tl: tl,
    cb: cb
  };

  return format(date, 'PPP', {
    locale: locales[language] || enUS
  });
};
```

### Number Formatting

```typescript
const formatCurrency = (amount: number, language: string) => {
  const formatters = {
    en: new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }),
    tl: new Intl.NumberFormat('fil-PH', {
      style: 'currency',
      currency: 'PHP'
    }),
    cb: new Intl.NumberFormat('ceb-PH', {
      style: 'currency',
      currency: 'PHP'
    })
  };

  return formatters[language].format(amount);
};
```

## URL Localization

### Language-Specific URLs

```typescript
// Use language prefix in URLs
const routes = [
  { path: '/en/services', component: Services },
  { path: '/tl/serbisyo', component: Services },
  { path: '/cb/serbisyo', component: Services }
];

// Or use query parameter
const servicesUrl = (language: string) => {
  return `/services?lang=${language}`;
};
```

## SEO for Multiple Languages

### Language Meta Tags

```html
<!-- Specify language -->
<html lang="en">

<!-- Alternate language versions -->
<link rel="alternate" hreflang="en" href="https://talibon.gov.ph/en/services">
<link rel="alternate" hreflang="tl" href="https://talibon.gov.ph/tl/serbisyo">
<link rel="alternate" hreflang="cb" href="https://talibon.gov.ph/cb/serbisyo">
<link rel="alternate" hreflang="x-default" href="https://talibon.gov.ph/services">
```

### Sitemap

Include all language versions in sitemap:

```xml
<url>
  <loc>https://talibon.gov.ph/en/services</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://talibon.gov.ph/en/services"/>
  <xhtml:link rel="alternate" hreflang="tl" href="https://talibon.gov.ph/tl/serbisyo"/>
  <xhtml:link rel="alternate" hreflang="cb" href="https://talibon.gov.ph/cb/serbisyo"/>
</url>
```

## Translation Management

### Translation Workflow

1. **Create English content first**
2. **Translate to Tagalog**
3. **Translate to Cebuano**
4. **Review by native speakers**
5. **Test in context**
6. **Publish**

### Translation Tools

- Manual translation by native speakers
- Professional translation services
- Community translation (with review)
- Machine translation (with human review)

### Translation Database

```typescript
// Store translations in database
interface Translation {
  id: string;
  key: string;
  language: string;
  value: string;
  context?: string;
  updatedBy: string;
  updatedAt: Date;
}
```

## Best Practices

### Do's

- Provide translations for all user-facing text
- Use native speakers for translation
- Test translations in context
- Keep translations up to date
- Consider cultural differences
- Use appropriate terminology
- Test RTL support if needed

### Don'ts

- Use machine translation without review
- Translate code comments
- Hardcode text in components
- Forget to translate error messages
- Ignore cultural nuances
- Mix languages in same content
- Skip translation testing

## Accessibility

### Language Attribute

Always set the correct language attribute:

```html
<html lang="en">
<html lang="tl">
<html lang="cb">
```

### Screen Readers

Ensure translations work with screen readers:
- Proper language tags
- Accurate translations
- Consistent terminology

## Testing

### Translation Testing

```typescript
describe('Localization', () => {
  it('should display English translations', () => {
    i18n.changeLanguage('en');
    const { t } = render(<ServiceCard />);
    expect(screen.getByText('Requirements')).toBeInTheDocument();
  });

  it('should display Tagalog translations', () => {
    i18n.changeLanguage('tl');
    const { t } = render(<ServiceCard />);
    expect(screen.getByText('Mga Kinakailangan')).toBeInTheDocument();
  });
});
```

### Visual Testing

Test layout with different languages:
- English (shorter text)
- Tagalog (longer text)
- Cebuano (different text length)

## Localization Checklist

### Implementation

- [ ] i18n framework configured
- [ ] Translation files created
- [ ] Language switcher implemented
- [ ] All UI text translatable
- [ ] Dynamic content localized
- [ ] Date/number formatting localized
- [ ] URL strategy defined

### Content

- [ ] English content complete
- [ ] Tagalog translations complete
- [ ] Cebuano translations complete
- [ ] Translations reviewed
- [ ] Content tested in context

### SEO

- [ ] Language meta tags added
- [ ] Alternate links configured
- [ ] Sitemap includes all languages
- [ ] hreflang tags correct

### Testing

- [ ] Translations tested
- [ ] Language switching tested
- [ ] Layout tested with all languages
- [ ] Accessibility tested

## References

- [React i18next Documentation](https://react.i18next.com/)
- [W3C Internationalization](https://www.w3.org/International/)
- [MDN Web Internationalization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
