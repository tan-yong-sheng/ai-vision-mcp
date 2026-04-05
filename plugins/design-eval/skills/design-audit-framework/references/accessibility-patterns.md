# Accessibility Patterns and Fixes

## Common Accessibility Issues and Solutions

### Color Contrast Issues

**Problem:** Text doesn't meet WCAG contrast ratio

**WCAG Requirements:**
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio

**Solutions:**

```css
/* Bad: insufficient contrast (2.5:1) */
color: #777777;
background-color: #ffffff;

/* Good: sufficient contrast (7:1) */
color: #404040;
background-color: #ffffff;

/* Good: use semantic colors */
--text-primary: #1a1a1a;     /* 9.5:1 on white */
--text-secondary: #424242;   /* 7:1 on white */
--text-disabled: #bdbdbd;    /* 4.5:1 on white */
```

**Testing:**
- Use WebAIM contrast checker
- Use DevTools lighthouse audit
- Use axe DevTools extension

---

### Missing Alt Text

**Problem:** Images lack descriptions for screen readers

**Solutions:**

```html
<!-- Bad: no alt text -->
<img src="chart.png">

<!-- Bad: redundant alt text -->
<img src="chart.png" alt="Image of chart">

<!-- Good: descriptive alt text -->
<img src="sales-chart-2026.png" alt="Sales increased 23% in Q1 2026">

<!-- Good: empty alt for decorative images -->
<img src="decorative-border.png" alt="">

<!-- Good: complex image with long description -->
<img src="process-diagram.png" alt="Three-step process diagram">
<details>
  <summary>Detailed process description</summary>
  <p>Step 1: User submits form. Step 2: System validates. Step 3: Confirmation sent.</p>
</details>
```

**Testing:**
- Screen reader testing
- Lighthouse audit
- Wave browser extension

---

### Keyboard Navigation Issues

**Problem:** Elements not reachable via keyboard

**Solutions:**

```html
<!-- Bad: no way to focus button -->
<div class="custom-button" onclick="doSomething()">Click me</div>

<!-- Good: native semantic element -->
<button onclick="doSomething()">Click me</button>

<!-- Good: custom element with tabindex and keyboard handlers -->
<div class="custom-button" tabindex="0" role="button"
     onkeydown="if(event.key==='Enter') doSomething()">
  Click me
</div>

<!-- Good: form elements are keyboard accessible by default -->
<input type="text">
<button type="submit">Submit</button>
```

**Testing:**
- Tab through the page - can you reach everything?
- Use keyboard only - can you accomplish all tasks?
- Check focus order - is it logical?

---

### Missing Form Labels

**Problem:** Form fields not associated with labels

**Solutions:**

```html
<!-- Bad: no label -->
<input type="text">

<!-- Bad: visual-only label -->
<div>Email</div>
<input type="text">

<!-- Good: label with for attribute -->
<label for="email">Email</label>
<input type="text" id="email">

<!-- Good: label wrapping input -->
<label>
  Email
  <input type="text" name="email">
</label>

<!-- Good: with aria-label for hidden labels -->
<input type="text" aria-label="Email address">
```

**Testing:**
- Screen reader announces label when focused
- Can click label to focus input

---

### Poor Focus Indicators

**Problem:** Focus outline removed or invisible

**Solutions:**

```css
/* Bad: no visible focus */
input:focus {
  outline: none;
}

/* Good: visible focus indicator */
input:focus {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}

/* Good: custom focus styles */
button:focus {
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.5);
}

/* Good: use :focus-visible for modern browsers */
input:focus-visible {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}
```

**Testing:**
- Tab through page
- Verify focus is always visible
- Check contrast of focus indicator

---

### Missing ARIA Labels

**Problem:** Screen readers can't identify components

**Solutions:**

```html
<!-- Bad: unclear button -->
<button>×</button>

<!-- Good: aria-label for icon buttons -->
<button aria-label="Close dialog">×</button>

<!-- Good: aria-label for icon-only buttons -->
<button aria-label="Search" class="icon-search"></button>

<!-- Good: aria-describedby for complex components -->
<div id="instructions">Enter your password</div>
<input type="password" aria-describedby="instructions">

<!-- Good: aria-live for updates -->
<div aria-live="polite" aria-atomic="true" id="status">
  Loading...
</div>

<!-- Good: aria-expanded for toggles -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" style="display:none;">...</ul>
```

**Testing:**
- Screen reader announces purpose
- ARIA roles are correct
- aria-live regions work

---

### Heading Hierarchy Issues

**Problem:** Headings don't follow logical hierarchy

**Solutions:**

```html
<!-- Bad: skips levels -->
<h1>Page Title</h1>
<h3>Section</h3>  <!-- Skipped h2 -->
<h4>Subsection</h4>

<!-- Good: logical hierarchy -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h2>Another Section</h2>

<!-- Good: use semantic landmarks with headings -->
<header>
  <h1>Site Title</h1>
</header>
<main>
  <h1>Page Title</h1>
  <h2>Section 1</h2>
  <h2>Section 2</h2>
</main>
<aside>
  <h2>Related Articles</h2>
</aside>
```

**Testing:**
- Use heading outline tools
- Verify logical hierarchy
- Check with screen reader

---

### Motion and Animation Issues

**Problem:** Animations ignore accessibility preferences

**Solutions:**

```css
/* Bad: motion plays regardless of preference */
@keyframes slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* Good: respect prefers-reduced-motion */
@keyframes slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Good: disable animations for motion-sensitive users */
.fade-in {
  animation: fadeIn 0.3s;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1;
  }
}
```

**Testing:**
- Enable "Reduce motion" in OS settings
- Verify animations are reduced or disabled
- Check that functionality still works

---

## Common ARIA Patterns

### Dialog Pattern
```html
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure?</p>
  <button>Cancel</button>
  <button>Confirm</button>
</div>
```

### Tabs Pattern
```html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div id="panel-1" role="tabpanel">Content 1</div>
<div id="panel-2" role="tabpanel">Content 2</div>
```

### Menu Pattern
```html
<button aria-haspopup="menu" aria-expanded="false">Menu</button>
<ul role="menu">
  <li role="menuitem"><a href="#">Option 1</a></li>
  <li role="menuitem"><a href="#">Option 2</a></li>
</ul>
```

### Search Pattern
```html
<form role="search">
  <label for="search">Search</label>
  <input id="search" type="text">
  <button type="submit">Search</button>
</form>
```

---

## Testing Accessibility

### Automated Tools
- **axe DevTools** - Browser extension, comprehensive checks
- **Lighthouse** - Chrome DevTools, quick audit
- **WAVE** - Wave.webaim.org, detailed analysis
- **Color Contrast Analyzer** - Check specific colors

### Manual Testing
- **Keyboard navigation** - Tab, arrow keys, enter/space
- **Screen reader** - NVDA (Windows), JAWS, VoiceOver (Mac)
- **Zoom testing** - 200% zoom, text resize
- **Color blindness** - Simulate with tools

### User Testing
- Test with actual users with disabilities
- Get feedback on usability
- Identify real-world issues
