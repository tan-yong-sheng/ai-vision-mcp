# WCAG 2.1 Compliance Checklist

## Perceivable

### 1.1 Text Alternatives
- [ ] All images have descriptive alt text
- [ ] Alt text describes purpose, not just "image"
- [ ] Decorative images have empty alt text (alt="")
- [ ] Complex images have long descriptions
- [ ] Videos have captions and transcripts

### 1.3 Adaptable
- [ ] Content is not dependent on shape or visual layout alone
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skipping)
- [ ] Lists are marked up with `<ul>`, `<ol>`, `<li>`
- [ ] Reading order is logical (tab order matches visual order)
- [ ] Instructions don't rely on shape, size, or visual location

### 1.4 Distinguishable
- [ ] Text contrast is at least 4.5:1 (normal text)
- [ ] Large text (18pt+) contrast is at least 3:1
- [ ] Text can be resized to 200% without loss of functionality
- [ ] Text is not justified (left-aligned or centered)
- [ ] Color is not the only way to convey information
- [ ] No audio plays automatically
- [ ] Visual focus indicator is visible

## Operable

### 2.1 Keyboard Accessible
- [ ] All functionality is available via keyboard
- [ ] No keyboard trap (can tab away from any element)
- [ ] Keyboard shortcuts don't conflict with browser/AT shortcuts
- [ ] Shortcut keys are documented

### 2.2 Enough Time
- [ ] No time limits, or user can extend them
- [ ] Auto-updating content can be paused
- [ ] No blinking/flashing content (>3 times per second)

### 2.3 Seizures and Physical Reactions
- [ ] No content flashes more than 3 times per second
- [ ] No patterns that could trigger seizures

### 2.4 Navigable
- [ ] Page has a descriptive title
- [ ] Focus order is logical
- [ ] Link purpose is clear from link text alone
- [ ] Multiple ways to find content (search, navigation, sitemap)
- [ ] Focus is visible (not hidden)
- [ ] Headings describe topic or purpose

## Understandable

### 3.1 Readable
- [ ] Page language is identified (lang attribute)
- [ ] Abbreviations are defined on first use
- [ ] Unusual words are defined
- [ ] Text is clear and simple

### 3.2 Predictable
- [ ] Navigation is consistent across pages
- [ ] Components behave consistently
- [ ] No unexpected context changes on input
- [ ] Submit buttons are clearly labeled

### 3.3 Input Assistance
- [ ] Form fields are labeled
- [ ] Error messages are specific and helpful
- [ ] Errors are identified and suggestions provided
- [ ] Legal/financial transactions can be reversed or confirmed

## Robust

### 4.1 Compatible
- [ ] HTML is valid (no duplicate IDs, proper nesting)
- [ ] ARIA is used correctly
- [ ] Name, role, value are available to assistive tech
- [ ] Status messages are announced to screen readers

## Quick Assessment

**Critical Issues (must fix):**
- Keyboard navigation broken
- Color contrast too low
- Images missing alt text
- Form fields not labeled
- No focus indicator

**High Priority (should fix):**
- Heading hierarchy incorrect
- Links not descriptive
- Error messages unclear
- Content flashing
- Time limits without extension

**Medium Priority (nice to have):**
- Abbreviations not defined
- Navigation not consistent
- Unusual words not explained
- Resize issues at 200%
