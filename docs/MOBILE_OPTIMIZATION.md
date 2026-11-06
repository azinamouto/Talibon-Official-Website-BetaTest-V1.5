# Mobile Optimization Guide

## Overview

This guide covers mobile optimization strategies for TAL.GOV, ensuring excellent user experience on mobile devices.

## Mobile-First Approach

### Philosophy

- **Design for mobile first**: Start with mobile design, then expand to desktop
- **Progressive enhancement**: Add features for larger screens
- **Touch-friendly**: Optimize for touch interactions
- **Performance**: Mobile networks are slower, optimize for speed

## Responsive Design

### Breakpoints

Use these breakpoints for responsive design:

```css
/* Mobile First Approach */

/* Base styles (mobile) */
.container {
  width: 100%;
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    max-width: 720px;
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 960px;
  }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
  }
}
```

### Fluid Layouts

Use flexible layouts that adapt to screen size:

```css
/* Fluid typography */
html {
  font-size: 16px;
}

h1 {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}

h2 {
  font-size: clamp(1.25rem, 3vw, 2rem);
}

/* Fluid grids */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

## Touch Optimization

### Touch Targets

Ensure touch targets are large enough:

```css
/* Minimum touch target: 44x44px */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

.input {
  min-height: 44px;
  padding: 12px;
}

.link {
  display: inline-block;
  padding: 8px 16px;
}
```

### Touch-Friendly Interactions

```css
/* Remove tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Touch feedback */
.button:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* Prevent zoom on inputs */
input[type="text"],
input[type="email"],
input[type="tel"],
textarea {
  font-size: 16px; /* Prevents iOS zoom */
}
```

### Swipe Gestures

Implement swipe navigation where appropriate:

```typescript
// Swipe to navigate
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => navigate('next'),
  onSwipedRight: () => navigate('prev'),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true
});

<div {...handlers}>
  {/* Content */}
</div>
```

## Mobile Navigation

### Hamburger Menu

Implement mobile-friendly navigation:

```typescript
// Mobile menu component
const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger"></span>
      </button>

      {isOpen && (
        <nav className="mobile-nav">
          <a href="/services">Services</a>
          <a href="/news">News</a>
          <a href="/departments">Departments</a>
          <a href="/contact">Contact</a>
        </nav>
      )}
    </>
  );
};
```

### Bottom Navigation

Consider bottom navigation for primary actions:

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: white;
  border-top: 1px solid #eee;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
}
```

### Sticky Headers

Keep navigation accessible:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

## Mobile Performance

### Image Optimization

```html
<!-- Responsive images -->
<picture>
  <source srcset="image-small.webp" media="(max-width: 480px)">
  <source srcset="image-medium.webp" media="(max-width: 768px)">
  <source srcset="image-large.webp" media="(min-width: 769px)">
  <img src="image-medium.jpg" alt="Description" loading="lazy">
</picture>
```

### Lazy Loading

```html
<!-- Lazy load images below the fold -->
<img src="placeholder.jpg" data-src="actual.jpg" loading="lazy" class="lazyload">

<!-- Lazy load components -->
const LazyComponent = lazy(() => import('./LazyComponent'));
```

### Code Splitting

```typescript
// Route-based code splitting
const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
```

### Reduce JavaScript

```typescript
// Remove unused code
// Tree shaking
// Minify in production
// Use smaller libraries
```

## Mobile UX Patterns

### Infinite Scroll

Implement infinite scroll for long lists:

```typescript
const InfiniteScroll = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    setLoading(true);
    const newItems = await fetchMoreItems(items.length);
    setItems([...items, ...newItems]);
    setLoading(false);
    setHasMore(newItems.length > 0);
  };

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<LoadingSpinner />}
    >
      {items.map(item => <Item key={item.id} data={item} />)}
    </InfiniteScroll>
  );
};
```

### Pull to Refresh

```typescript
// Pull to refresh for content
import { usePullToRefresh } from './hooks/usePullToRefresh';

const PullToRefresh = () => {
  const { isRefreshing, onRefresh } = usePullToRefresh();

  return (
    <div
      className="refresh-container"
      onTouchStart={onRefresh}
    >
      {isRefreshing && <LoadingSpinner />}
      {/* Content */}
    </div>
  );
};
```

### Mobile Forms

Optimize forms for mobile:

```html
<!-- Use appropriate input types -->
<input type="email" placeholder="Email">
<input type="tel" placeholder="Phone number">
<input type="number" placeholder="Amount">

<!-- Use inputmode for numeric keypad -->
<input type="text" inputmode="numeric" pattern="[0-9]*">

<!-- Autocomplete -->
<input type="text" autocomplete="name">
<input type="email" autocomplete="email">

<!-- Clear labels -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

<!-- Single column layout on mobile -->
<form className="mobile-form">
  <div className="form-group">
    <label>Email</label>
    <input type="email">
  </div>
  <div className="form-group">
    <label>Password</label>
    <input type="password">
  </div>
  <button type="submit">Login</button>
</form>
```

## Mobile-Specific Features

### PWA Capabilities

Add Progressive Web App features:

```json
// manifest.json
{
  "name": "TAL.GOV",
  "short_name": "TalGov",
  "description": "Digital Talibon Municipal Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#005fcc",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered');
      })
      .catch(error => {
        console.log('SW registration failed');
      });
  });
}
```

### Geolocation

Use geolocation for location-based services:

```typescript
const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Use location
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  }
};
```

### Share API

Implement native sharing:

```typescript
const shareContent = async (title: string, url: string) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        url
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  } else {
    // Fallback to copy to clipboard
    navigator.clipboard.writeText(url);
  }
};
```

## Mobile Testing

### Device Testing

Test on actual devices:

- iOS (iPhone)
- Android (various devices)
- Windows Phone (if needed)
- Tablets (iPad, Android tablets)

### Emulators and Simulators

Use development tools:

- Chrome DevTools Device Mode
- iOS Simulator
- Android Emulator
- BrowserStack

### Testing Checklist

- [ ] Touch targets large enough
- [ ] Text readable without zoom
- [ ] Forms easy to complete
- [ ] Navigation accessible
- [ ] Performance acceptable
- [ ] No horizontal scrolling
- [ ] Images load quickly
- [ ] Buttons work with touch

## Mobile Analytics

### Track Mobile Metrics

```typescript
// Track device type
analytics.track('page_view', {
  device_type: isMobile() ? 'mobile' : 'desktop',
  os: getOS(),
  screen_size: getScreenSize()
});

// Track touch interactions
analytics.track('button_click', {
  method: 'touch',
  element: elementId
});
```

### Key Mobile Metrics

- Mobile vs desktop usage
- Device types
- Screen sizes
- Touch vs click interactions
- Mobile conversion rates
- Mobile bounce rate

## Common Mobile Issues

### Avoid These

- Text too small to read
- Touch targets too small
- Horizontal scrolling
- Difficult to tap
- Slow loading
- Large file sizes
- Poor mobile navigation
- Forms hard to complete

## Best Practices

### Do's

- Design mobile-first
- Use large touch targets
- Optimize images
- Minimize JavaScript
- Test on real devices
- Consider offline access
- Use native features when possible
- Keep it simple

### Don'ts

- Scale desktop design
- Use small fonts
- Require hover
- Ignore performance
- Skip mobile testing
- Use fixed widths
- Overcomplicate interactions
- Forget accessibility

## Mobile Optimization Checklist

### Design

- [ ] Mobile-first design
- [ ] Responsive layouts
- [ ] Touch-friendly interactions
- [ ] Large touch targets
- [ ] Clear typography
- [ ] Accessible navigation

### Performance

- [ ] Images optimized
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Minified assets
- [ ] Fast loading
- [ ] Smooth scrolling

### Features

- [ ] PWA features
- [ ] Offline support
- [ ] Geolocation (if needed)
- [ ] Share API
- [ ] Push notifications (if needed)

### Testing

- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested on tablets
- [ ] Performance tested
- [ ] Accessibility tested

## References

- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Web.dev Mobile](https://web.dev/mobile/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Touch Targets](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
