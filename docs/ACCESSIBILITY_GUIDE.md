# Accessibility Guide

## Overview

This guide outlines accessibility requirements and best practices for TAL.GOV, ensuring the platform is usable by all citizens, including those with disabilities.

## Legal Requirements

### Standards Compliance

- **WCAG 2.1 Level AA**: Web Content Accessibility Guidelines
- **RA 7277**: Magna Carta for Disabled Persons (Philippines)
- **BPCP Act**: Data Privacy Act considerations
- **Republic Act 11259**: Alternative Form of Communication

### Target Audience

- Citizens with visual impairments
- Citizens with hearing impairments
- Citizens with motor disabilities
- Citizens with cognitive disabilities
- Elderly citizens
- Citizens using assistive technologies

## Core Accessibility Principles

### POUR

1. **Perceivable**: Information must be presentable in ways users can perceive
2. **Operable**: Interface components must be operable
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough to be interpreted by assistive technologies

## Technical Requirements

### Semantic HTML

Use proper HTML5 semantic elements.

```html
<!-- Good -->
<header>
  <nav>
    <ul>
      <li><a href="/services">Services</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Service Name</h1>
    <p>Description...</p>
  </article>
</main>
<footer>...</footer>

<!-- Bad -->
<div class="header">...</div>
<div class="content">...</div>
<div class="footer">...</div>
```

### Keyboard Navigation

All functionality must be accessible via keyboard.

```typescript
// Ensure all interactive elements are keyboard accessible
<button onClick={handleClick} tabIndex={0}>Submit</button>

// Handle keyboard events
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
};

<button onClick={handleClick} onKeyDown={handleKeyDown}>
  Submit
</button>
```

### Focus Management

```typescript
// Visible focus indicators
button:focus {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}

// Skip to main content link
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

// Focus management for modals
const openModal = () => {
  setIsModalOpen(true);
  setTimeout(() => {
    modalRef.current?.focus();
  }, 0);
};
```

### Alt Text for Images

```html
<!-- Descriptive alt text -->
<img src="mayor.jpg" alt="Mayor Juan dela Cruz of Talibon">

<!-- Decorative images -->
<img src="decorative-pattern.png" alt="" role="presentation">

<!-- Functional images -->
<img src="print-icon.png" alt="Print this document">

<!-- Complex images with long descriptions -->
<img src="org-chart.png" alt="Municipal organizational chart">
<details>
  <summary>Detailed description of organizational chart</summary>
  <p>Long description here...</p>
</details>
```

### Color Contrast

Ensure sufficient color contrast for text and interactive elements.

```css
/* Minimum contrast ratios */
/* Normal text: 4.5:1 */
/* Large text (18pt+): 3:1 */
/* UI components: 3:1 */

/* Good */
.text-primary {
  color: #000000; /* Black on white */
  background-color: #ffffff;
}

/* Bad - insufficient contrast */
.text-low-contrast {
  color: #cccccc; /* Light gray on white */
  background-color: #ffffff;
}
```

### Form Accessibility

```html
<!-- Proper label association -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email" required>

<!-- Error messages -->
<div role="alert" aria-live="polite">
  <p class="error-message">Please enter a valid email address</p>
</div>

<!-- Fieldset for related form controls -->
<fieldset>
  <legend>Contact Information</legend>
  <label for="phone">Phone Number</label>
  <input type="tel" id="phone" name="phone">
</fieldset>

<!-- Required fields clearly marked -->
<label for="email">Email Address <span aria-label="required">*</span></label>
<input type="email" id="email" name="email" required aria-required="true">
```

### ARIA Attributes

Use ARIA attributes to enhance accessibility when semantic HTML isn't sufficient.

```html
<!-- Landmark roles -->
<nav role="navigation" aria-label="Main navigation">
<main role="main" aria-label="Service information">
<aside role="complementary" aria-label="Related services">

<!-- Live regions for dynamic content -->
<div aria-live="polite" aria-atomic="true">
  Status message here
</div>

<!-- Expanded/collapsed states -->
<button aria-expanded="false" aria-controls="menu" onClick={toggleMenu}>
  Menu
</button>
<ul id="menu" hidden>
  <li>Item 1</li>
</ul>

<!-- Dialog/Modal -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Modal Title</h2>
  <button aria-label="Close modal" onClick={closeModal}>×</button>
</div>
```

## Testing for Accessibility

### Automated Testing

```bash
# Install axe DevTools
npm install --save-dev @axe-core/react

# Run accessibility tests
npm run test:a11y

# Lighthouse accessibility audit
lighthouse https://talibon.gov.ph --only-categories=accessibility
```

### Manual Testing Checklist

#### Keyboard Navigation

- [ ] Tab order is logical
- [ ] All interactive elements receive focus
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts don't conflict with browser shortcuts
- [ ] Focus trap in modals works correctly

#### Screen Reader Testing

- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with TalkBack (Android)
- [ ] All content is announced correctly
- [ ] Image alt text is appropriate
- [ ] Form errors are announced

#### Color Contrast

- [ ] Normal text contrast ≥ 4.5:1
- [ ] Large text contrast ≥ 3:1
- [ ] UI components contrast ≥ 3:1
- [ ] Color not the only indicator

#### Content Readability

- [ ] Language is declared
- [ ] Text is resizable up to 200%
- [ ] Line length is 60-80 characters
- [ ] Content is clear and simple

## Common Accessibility Issues

### Missing Alt Text

**Problem**: Images without alt text or with poor alt text

**Solution**:
```html
<!-- Instead of -->
<img src="photo.jpg">

<!-- Use -->
<img src="photo.jpg" alt="Mayor delivering speech at town hall">
```

### Poor Color Contrast

**Problem**: Text hard to read due to low contrast

**Solution**:
```css
/* Use contrast checker to verify */
/* Good contrast */
color: #333333;
background-color: #ffffff;

/* Use CSS custom properties for consistent contrast */
:root {
  --text-primary: #000000;
  --text-secondary: #333333;
  --background: #ffffff;
}
```

### Keyboard Traps

**Problem**: Users can't navigate away from certain elements

**Solution**:
```typescript
// Implement focus trap for modals
const useFocusTrap = (ref: RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTab);
    return () => element.removeEventListener('keydown', handleTab);
  }, [ref]);
};
```

### Missing Form Labels

**Problem**: Form inputs without associated labels

**Solution**:
```html
<!-- Always use labels -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

<!-- Or aria-label for icon buttons -->
<button aria-label="Search" onClick={handleSearch}>
  <SearchIcon />
</button>
```

## Accessibility Features

### Font Size Adjustment

```css
/* Support text scaling */
html {
  font-size: 16px;
}

/* Use relative units */
body {
  font-size: 1rem;
  line-height: 1.5;
}

h1 {
  font-size: 2rem;
}
```

### Reduced Motion Support

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Skip Links

```html
<!-- Add skip link for keyboard users -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
</style>
```

## Documentation and Training

### Accessibility Statement

Publish an accessibility statement on the website:

```html
<section aria-labelledby="a11y-heading">
  <h2 id="a11y-heading">Accessibility Statement</h2>
  <p>
    TAL.GOV is committed to ensuring digital accessibility for all citizens.
    We are continually improving the user experience for everyone and applying
    the relevant accessibility standards.
  </p>
  <h3>Measures to support accessibility</h3>
  <ul>
    <li>WCAG 2.1 Level AA compliance</li>
    <li>Regular accessibility audits</li>
    <li>User testing with assistive technologies</li>
  </ul>
</section>
```

### Developer Training

All developers should be trained on:
- WCAG 2.1 guidelines
- Screen reader basics
- Keyboard navigation
- ARIA attributes
- Accessibility testing tools

## Continuous Improvement

### Regular Audits

- **Monthly**: Automated accessibility testing
- **Quarterly**: Manual accessibility audit
- **Annually**: Comprehensive accessibility review
- **Ongoing**: User feedback monitoring

### User Testing

Include users with disabilities in testing:
- Screen reader users
- Keyboard-only users
- Users with low vision
- Users with motor disabilities

## Resources

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/)

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [Philippines RA 7277](https://www.officialgazette.gov.ph/1992/03/24/republic-act-no-7277/)

## Accessibility Checklist

### Pre-Deployment

- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] All functionality keyboard accessible
- [ ] Forms have proper labels
- [ ] Focus indicators visible
- [ ] Semantic HTML used
- [ ] ARIA attributes correct
- [ ] Automated tests pass
- [ ] Manual testing completed
- [ ] Screen reader tested

### Regular Maintenance

- [ ] Monthly: Automated testing
- [ ] Quarterly: Manual audit
- [ ] Ongoing: Monitor user feedback
- [ ] As needed: Train new developers
