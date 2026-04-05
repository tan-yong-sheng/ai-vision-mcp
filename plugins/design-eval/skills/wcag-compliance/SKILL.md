---
name: wcag-compliance
description: "Use this skill when verifying WCAG 2.1/3.0 compliance, mapping accessibility violations to specific criteria, or providing remediation guidance with code examples"
user-invocable: false
---

# WCAG Compliance

Deep accessibility compliance guidance for WCAG 2.1 (compliance-focused) and WCAG 3.0 (outcome-focused) standards.

## When to Use

Use this skill when:
- Auditing for WCAG 2.1 or WCAG 3.0 compliance
- Mapping findings to specific WCAG criteria
- Providing remediation guidance with code examples
- Testing accessibility fixes
- Explaining user impact and accommodation needs

## WCAG 2.1 vs WCAG 3.0: Paradigm Shift

### WCAG 2.1 (Compliance-Focused)

**Approach**: Binary pass/fail against specific technical criteria

**Levels**:
- **Level A**: Basic accessibility (minimum)
- **Level AA**: Enhanced accessibility (widely adopted standard)
- **Level AAA**: Enhanced++ accessibility (specialized use cases)

**Example**: WCAG 2.1 4.1.2 "Name, Role, Value"
- Technical criterion: Form inputs must have associated labels
- Pass/Fail: Label element connected via `<label for="id">` OR `aria-label` OR `aria-labelledby`
- Test: Screen reader reads label when focused

### WCAG 3.0 (Outcome-Focused)

**Approach**: Outcome-centered goals that users can achieve regardless of disability

**Dimensions**:
- **Perceivable**: Users can perceive content (visual, auditory, tactile alternatives)
- **Operable**: Users can operate the interface (keyboard, voice, switch control)
- **Understandable**: Users understand information and operations (clear language, predictable behavior)
- **Robust**: Works with assistive technologies (diverse browsers, devices, AT tools)

**Example**: WCAG 3.0 "Form Labels" Outcome
- User outcome: "Users know what data a form field accepts"
- Techniques to achieve outcome:
  - Visual label + screen reader label (standard)
  - Placeholder text + autocomplete (partial)
  - Icon + tooltip + ARIA label (alternative)
  - Voice command + validation message (speech interface)
- Test: Test with diverse users and assistive technologies

## WCAG 2.1 Compliance Checklist

### Perceivable (1.x)

#### 1.1 Text Alternatives
- **1.1.1 Non-text Content (Level A)**
  - Images need `alt` text
  - Icons need `aria-label` or `aria-labelledby`
  - Canvas needs fallback text or ARIA description
  - Remediation: Add alt text that describes image purpose (not "image of button", but "save file button")

#### 1.2 Time-based Media
- **1.2.1 Captions (Level A)**: Video has captions
- **1.2.2 Transcripts (Level A)**: Audio has transcript
- **1.2.3 Audio Description (Level A)**: Video has audio description for visual content
- Remediation: Use video hosting with caption support (YouTube, Vimeo)

#### 1.3 Adaptable
- **1.3.1 Info and Relationships (Level A)**
  - Headings use `<h1>-<h6>` (not styled divs)
  - Lists use `<ul>`, `<ol>`, `<li>` (not divs)
  - Form fields have associated labels
  - Remediation: Use semantic HTML (not `<div class="h1">`)

#### 1.4 Distinguishable
- **1.4.3 Contrast (Level AA)**: Text color contrast ≥ 4.5:1 (normal), ≥ 3:1 (large)
  - Large text = 18pt+ or 14pt bold+
  - Remediation: Use contrast checker tool, adjust colors
- **1.4.5 Images of Text (Level AA)**: Don't use images for text (use real text with CSS)
  - Remediation: Replace image with HTML text + CSS styling
- **1.4.10 Reflow (Level AA)**: Content doesn't require horizontal scroll at 200% zoom
  - Remediation: Test at 200% zoom, ensure responsive layout
- **1.4.11 Non-text Contrast (Level AA)**: Visual elements contrast ≥ 3:1
  - Applies to: buttons, icons, form borders, focus indicators
  - Remediation: Increase border width or adjust colors

### Operable (2.x)

#### 2.1 Keyboard Accessible
- **2.1.1 Keyboard (Level A)**: All functionality works via keyboard
  - Remediation: Test with Tab/Shift+Tab, Enter, Spacebar, Arrow keys
- **2.1.2 No Keyboard Trap (Level A)**: Keyboard focus doesn't get stuck
  - Remediation: Ensure Tab can always exit elements
- **2.1.3 Keyboard (No Exception) (Level AAA)**: All functionality keyboard-accessible (no mouse-only features)
  - Remediation: Implement keyboard equivalents for all interactions

#### 2.2 Enough Time
- **2.2.1 Timing Adjustable (Level A)**: No auto-advancing content or time limits
  - Exception: Real-time events (video, games)
  - Remediation: Remove auto-play, provide pause controls

#### 2.3 Seizures and Physical Reactions
- **2.3.1 Three Flashes (Level A)**: Animation doesn't flash >3x/second
  - Remediation: Limit animation frequency
- **2.4.3 Focus Order (Level A)**: Tab order is logical
  - Remediation: Set `tabindex` if needed, or restructure DOM

#### 2.4 Navigable
- **2.4.1 Bypass Blocks (Level A)**: Skip navigation links
  - Remediation: Add "Skip to main content" link
- **2.4.3 Focus Visible (Level AA)**: Focus indicator always visible
  - Remediation: Style `:focus` or `:focus-visible`
- **2.4.7 Focus Visible (Level AA)**: Focus indicator obvious
  - Remediation: Use outline or background color (not just color change)

### Understandable (3.x)

#### 3.1 Readable
- **3.1.1 Language of Page (Level A)**: Set `<html lang="en">`
  - Remediation: Add lang attribute
- **3.1.2 Language of Parts (Level AA)**: Marked-up language changes
  - Remediation: Use `<span lang="es">Hola</span>` for language switches

#### 3.2 Predictable
- **3.2.1 On Focus (Level A)**: Focus doesn't trigger unexpected action
  - Remediation: Don't submit forms on focus, don't navigate on blur
- **3.2.2 On Input (Level A)**: Input doesn't trigger unexpected action
  - Remediation: Don't auto-submit on radio button selection without confirmation

#### 3.3 Input Assistance
- **3.3.1 Error Identification (Level A)**: Errors identified to user
  - Remediation: Show error message with `role="alert"` near field
- **3.3.2 Labels or Instructions (Level A)**: Fields have labels or instructions
  - Remediation: Use `<label>` or `aria-label`
- **3.3.4 Error Prevention (Level AA)**: Legal/financial transactions are reversible
  - Remediation: Confirmation dialog before irreversible action

### Robust (4.x)

#### 4.1 Compatible
- **4.1.2 Name, Role, Value (Level A)**: All elements have name, role, value
  - Name: From label or `aria-label`
  - Role: From semantic HTML or `role` attribute
  - Value: From `value`, `aria-valuenow`, checked state
  - Remediation: Use semantic HTML (`<button>`, `<input>`, etc.)
- **4.1.3 Status Messages (Level AA)**: Status messages announced to screen readers
  - Remediation: Use `role="status"` or `role="alert"`

## WCAG 3.0 Outcome-Focused Approach

### Outcome Assessment Template

For each finding:

1. **User Outcome at Risk**
   - What can the user NOT do because of this issue?
   - Example: "User cannot understand what the form field expects"

2. **Disability Impact**
   - How do different disabilities experience this?
   - Blindness: No visual label (screen reader reads nothing)
   - Low vision: Label too small to read
   - Motor: Cannot reach target size button
   - Cognitive: Complex language in error message

3. **Remediation to Restore Outcome**
   - What change restores the user's ability?
   - Technical implementation details
   - Example: "Add visible label + aria-label, ensure 3:1 contrast, make button 44x44px"

4. **Outcome Verification**
   - How do we verify outcome is achieved?
   - User testing with disabilities
   - AT testing (screen reader, voice control, switch)
   - Example: "Screen reader announces label clearly; user can identify field purpose"

## Remediation Code Patterns

### Pattern 1: Form Field with Label

```html
<!-- WCAG 2.1 AA compliant -->
<label for="email-input">Email address</label>
<input 
  id="email-input" 
  type="email" 
  aria-describedby="email-help"
  required
/>
<small id="email-help">We'll never share your email</small>

<!-- Error state -->
<input 
  id="email-input" 
  aria-invalid="true" 
  aria-describedby="email-error"
/>
<div id="email-error" role="alert">
  Invalid email format
</div>
```

### Pattern 2: Icon Button with Accessible Label

```html
<!-- WCAG 2.1 AA compliant -->
<button aria-label="Close dialog" onclick="closeDialog()">
  <svg aria-hidden="true" width="24" height="24">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"/>
  </svg>
</button>
```

### Pattern 3: Color Contrast for Interactive Elements

```css
/* WCAG 2.1 AA: 3:1 for UI components */
button {
  background: #0066cc;  /* Blue */
  color: white;         /* White on blue: 8.59:1 ✓ */
  border: 2px solid #0066cc;
}

button:focus-visible {
  outline: 3px solid #ffb81c;  /* Yellow: 5.8:1 on blue ✓ */
  outline-offset: 2px;
}

/* Disable default outline that has poor contrast */
button:focus {
  outline: none;
}
```

### Pattern 4: Keyboard Navigation

```html
<!-- WCAG 2.1 AA: Tab order, focus visible -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<style>
  a:focus-visible {
    outline: 3px solid #4c90e2;
    outline-offset: 2px;
  }
</style>
```

### Pattern 5: Motion Preferences

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .modal {
    animation: slideIn 0.3s ease-out;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: none;
    opacity: 1;
  }
}
```

## Testing Checklist

### Automated Testing
- [ ] axe DevTools (Chrome/Firefox extension)
- [ ] WAVE (WebAIM)
- [ ] Lighthouse (Google)
- [ ] Pa11y (CLI tool)

### Manual Testing
- [ ] Keyboard navigation (Tab, Shift+Tab, Enter, Space)
- [ ] Screen reader (NVDA, JAWS, VoiceOver)
- [ ] Color contrast (WebAIM Contrast Checker)
- [ ] Zoom to 200%
- [ ] Disable CSS (text-only mode)
- [ ] Disable JavaScript

### User Testing
- [ ] Test with keyboard-only users
- [ ] Test with screen reader users
- [ ] Test with users with low vision
- [ ] Test with users with motor disabilities
- [ ] Test with users with cognitive disabilities

## 3-Phase Accessibility Workflow

### Phase 1: Analysis
Understand current accessibility state and identify violations.

1. Run automated scanning (axe, WAVE, Pa11y, Lighthouse)
2. Conduct manual keyboard and screen reader testing
3. Document findings with WCAG criterion mapping
4. Assess coverage across Perceivable, Operable, Understandable, Robust dimensions
5. Prioritize by severity: Critical (blocks access) > High (degrades access) > Medium > Low

**Output**: Prioritized list of violations with WCAG criteria, affected elements, and user impact

### Phase 2: Remediation
Provide detailed fixes with code examples and testing steps.

For each finding:
1. Map to specific WCAG criterion (e.g., "WCAG 2.1 1.4.3 Contrast Level AA")
2. Explain impact on users with disabilities
3. Provide before/after code example
4. Suggest testing verification (keyboard, screen reader, contrast checker)
5. Estimate effort (quick fix, moderate, design change)

**Output**: Remediation guidance with code examples and verification steps

### Phase 3: Verification
Ensure fixes are correct and accessibility is maintained.

1. Verify all critical findings resolved
2. Test with keyboard navigation (Tab, Shift+Tab, Enter, Space, Arrow keys)
3. Test with screen readers (NVDA, JAWS, VoiceOver)
4. Verify color contrast ratios meet WCAG level
5. Confirm focus indicators visible and obvious
6. Test at 200% zoom
7. Validate semantic HTML (heading hierarchy, landmarks, lists)
8. Verify ARIA patterns implemented correctly
9. Test forms (labels, errors, instructions)
10. Confirm motion preferences respected (prefers-reduced-motion)

**Output**: Compliance verification report with WCAG level achieved (A/AA/AAA)

## Assistive Technology Testing Guide

### Screen Readers

**NVDA (Windows)**
- Start NVDA: `nvda.exe` or system tray
- Key commands: Insert+H (help), Insert+Down (read current), Tab (next element), Shift+Tab (previous)
- Test: Navigate entire page with keyboard only, verify all content announced

**JAWS (Windows)**
- Start JAWS: System tray or `jaws.exe`
- Key commands: Insert+H (help), Insert+Down (read current), Tab (next), Shift+Tab (previous)
- Virtual cursor: Insert+Z toggles between virtual cursor (browse mode) and forms mode
- Test: Verify form labels announced, headings read correctly, links have descriptive text, ARIA live regions update

**VoiceOver (macOS/iOS)**
- Start: Cmd+F5 (macOS) or Settings > Accessibility > VoiceOver (iOS)
- Key commands: VO+H (help), VO+Right Arrow (next), VO+Left Arrow (previous)
- Test: Navigate with keyboard, verify interactive elements announced with role and state

### Keyboard-Only Navigation
- Tab through entire interface — all interactive elements reachable
- Verify Tab order is logical and sequential
- Confirm focus indicators visible at all times
- Test Enter/Space on buttons, links, form controls
- Test Arrow keys in menus, tabs, sliders
- Verify no keyboard traps (can always Tab away)

### Voice Control
- Test voice commands for common actions (click button, submit form, navigate)
- Verify all interactive elements have accessible names for voice control
- macOS Voice Control: System Preferences > Accessibility > Voice Control
  - Commands: "Click [element name]", "Press [button name]", "Show numbers" (for clickable elements)
- Windows Speech Recognition: Settings > Ease of Access > Speech Recognition
  - Commands: "Click [element name]", "Press [button name]", "Show numbers"
  - Test: For each interactive element, verify voice command works end-to-end

### Color & Vision
- Test with WebAIM Contrast Checker (minimum 4.5:1 for normal text, 3:1 for large text)
- Test with color blindness simulator (Coblis, Color Oracle)
- Verify information not conveyed by color alone (use text, icons, patterns)
- Test at 200% zoom — content reflows, readable, no horizontal scroll

## Best Practices

### Finding Prioritization
Use this matrix to prioritize remediation:
- **Critical**: Blocks user task completion (e.g., form cannot be submitted)
- **High**: Significantly impacts user experience (e.g., button not keyboard accessible)
- **Medium**: Noticeable but workaround exists (e.g., low contrast on secondary text)
- **Low**: Polish/refinement (e.g., minor ARIA improvement)

### WCAG Level Selection
- **Level A**: Minimum accessibility (rarely sufficient for public-facing products)
- **Level AA**: Industry standard (target for most products)
- **Level AAA**: Enhanced accessibility (specialized use cases, high-stakes applications)

### Tool Selection
- **axe DevTools**: Quick automated scan, browser extension, good for CI/CD
- **WAVE**: Visual feedback on page, highlights issues inline
- **Pa11y**: CLI tool, scriptable, good for automation
- **Lighthouse**: Built into Chrome DevTools, includes accessibility audit
- **Manual testing**: Essential — automated tools miss ~30% of issues

### Common Pitfalls
- Relying only on automated tools (miss context-dependent issues)
- Fixing only critical issues (medium/low issues compound over time)
- Testing with only one screen reader (behavior varies)
- Forgetting keyboard-only users (not all AT users use screen readers)
- Assuming color contrast is sufficient (also need semantic meaning)
- Not testing with real users with disabilities (assumptions often wrong)

## Reference Materials

- WCAG 2.1 Specification: https://www.w3.org/WAI/WCAG21/quickref/
- WCAG 3.0 Explainer: https://www.w3.org/TR/wcag-3.0-explainer/
- WebAIM Resources: https://webaim.org/