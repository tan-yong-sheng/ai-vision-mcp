# WCAG 3.0 Outcomes Framework

WCAG 3.0 shifts from compliance checkboxes to outcome-focused accessibility. This framework explains the paradigm shift and provides guidance for outcome-focused auditing.

---

## WCAG 2.1 vs WCAG 3.0: Paradigm Shift

### WCAG 2.1 (Compliance-Focused)
- **Approach**: "Did you meet this criterion?"
- **Mindset**: Checkbox compliance
- **Example**: "Contrast ratio must be 4.5:1"
- **Problem**: Technically compliant but still inaccessible (e.g., compliant contrast but unreadable font size)

### WCAG 3.0 (Outcome-Focused)
- **Approach**: "Can users achieve their goals?"
- **Mindset**: User outcomes matter
- **Example**: "Users can perceive text regardless of vision ability"
- **Benefit**: Focuses on real user impact, not just technical compliance

---

## The Four Accessibility Dimensions

### 1. Perceivable

**User Outcome**: Users can perceive all information presented.

**Key Questions**:
- Can users with low vision read text?
- Can users with color blindness distinguish information?
- Can deaf users access audio content?
- Can users with cognitive disabilities understand visual complexity?

**Common Barriers**:
- Text too small or low contrast
- Information conveyed by color alone
- No captions for audio
- Complex visual layouts
- Flashing content causes seizures

**Remediation Focus**:
- Ensure sufficient contrast (not just 4.5:1, but readable)
- Provide text alternatives for images
- Caption audio and video
- Simplify visual design
- Avoid flashing/strobing

---

### 2. Operable

**User Outcome**: Users can navigate and interact with the interface.

**Key Questions**:
- Can keyboard-only users operate everything?
- Can users with motor disabilities use the interface?
- Can users with tremors or limited dexterity interact?
- Can users with speech disabilities control the interface?

**Common Barriers**:
- Mouse-only interactions
- Tiny touch targets
- Keyboard traps
- No focus indicators
- Time-limited interactions
- Complex gestures required

**Remediation Focus**:
- Keyboard accessibility for all interactions
- Sufficient touch target size (24×24px minimum)
- Clear focus indicators
- No time limits or ability to extend
- Single-pointer alternatives to gestures
- Skip links for repetitive content

---

### 3. Understandable

**User Outcome**: Users can understand the interface and content.

**Key Questions**:
- Can users with cognitive disabilities understand the language?
- Is the interface predictable and consistent?
- Can users recover from errors?
- Are instructions clear?

**Common Barriers**:
- Complex language or jargon
- Inconsistent navigation
- Unexpected changes on focus/input
- Unclear error messages
- No help or instructions
- Confusing form layouts

**Remediation Focus**:
- Clear, simple language
- Consistent navigation and labeling
- Predictable behavior
- Helpful error messages with suggestions
- Clear instructions and labels
- Logical form structure

---

### 4. Robust

**User Outcome**: Users can access content with assistive technologies.

**Key Questions**:
- Do screen readers announce all content?
- Can assistive tech understand the structure?
- Are ARIA roles and states correct?
- Is the code valid and semantic?

**Common Barriers**:
- Missing semantic HTML
- Incorrect ARIA roles
- Missing accessible names
- Invalid HTML
- Custom components without accessibility

**Remediation Focus**:
- Semantic HTML (buttons, links, headings, landmarks)
- Correct ARIA roles and states
- Accessible names for all interactive elements
- Valid HTML
- Test with screen readers

---

## Outcome-Focused Audit Workflow

### Phase 1: User Journey Mapping

**Goal**: Understand what users are trying to accomplish.

**Steps**:
1. Identify primary user tasks (e.g., "log in", "submit form", "find product")
2. Map the interaction flow for each task
3. Identify decision points and error states
4. Note where assistive tech users might struggle

**Example**:
```
Task: "Log in to account"
Flow:
  1. Navigate to login page
  2. Find email field
  3. Enter email
  4. Find password field
  5. Enter password
  6. Submit form
  7. Handle error (if any)
  8. Confirm successful login

Accessibility checkpoints:
  - Can keyboard user navigate to login page?
  - Can screen reader user find email field?
  - Are error messages announced?
  - Is success confirmed?
```

### Phase 2: Outcome Assessment

**Goal**: Evaluate whether each outcome is achievable.

**For each outcome dimension:**

1. **Perceivable**: Can users perceive all information?
   - Test with low vision (zoom, magnification)
   - Test with color blindness (simulator)
   - Test with screen reader
   - Check contrast ratios
   - Verify captions/transcripts

2. **Operable**: Can users navigate and interact?
   - Test keyboard-only navigation
   - Test with screen reader
   - Check focus indicators
   - Verify touch targets
   - Test with speech control

3. **Understandable**: Can users understand?
   - Read content aloud (text-to-speech)
   - Check language clarity
   - Verify error messages
   - Test form labels
   - Check consistency

4. **Robust**: Can assistive tech access content?
   - Test with NVDA, JAWS, VoiceOver
   - Validate HTML
   - Check ARIA implementation
   - Verify semantic structure

### Phase 3: Impact Assessment

**Goal**: Prioritize findings by user impact.

**For each barrier found:**

1. **Who is affected?**
   - Blind users
   - Low vision users
   - Color blind users
   - Deaf users
   - Hard of hearing users
   - Motor disabilities
   - Cognitive disabilities
   - Aging users

2. **What outcome is blocked?**
   - Can't perceive content
   - Can't navigate
   - Can't understand
   - Can't use assistive tech

3. **How severe?**
   - **Critical**: Blocks task completion entirely
   - **High**: Significantly impairs task completion
   - **Medium**: Makes task harder but possible
   - **Low**: Minor inconvenience

**Example**:
```
Finding: "Login button has no focus indicator"

Who: Keyboard-only users, motor disabilities
Outcome: Can't navigate (don't know where focus is)
Severity: Critical (can't log in without knowing where focus is)
Remediation: Add visible focus indicator (outline or background change)
```

### Phase 4: Remediation Planning

**Goal**: Design solutions that restore outcomes.

**For each barrier:**

1. **Understand the root cause**
   - Is it a code issue? (missing ARIA, invalid HTML)
   - Is it a design issue? (too small, low contrast)
   - Is it a content issue? (unclear language, missing captions)

2. **Design the solution**
   - What change restores the outcome?
   - Does it work for all users?
   - Does it maintain design intent?

3. **Verify the fix**
   - Test with affected users
   - Test with assistive tech
   - Verify no new barriers introduced

**Example**:
```
Barrier: "Error message not announced to screen readers"

Root cause: Error message is visual only, no aria-live
Solution: Add aria-live="polite" to error container
Verification: Test with NVDA, confirm error is announced
```

---

## Outcome-Focused Remediation Patterns

### Pattern 1: Perceivable Text

**Outcome**: Users can read text.

**Barriers**:
- Too small (< 14px)
- Low contrast (< 4.5:1)
- Poor font choice (decorative fonts)
- Insufficient line spacing

**Remediation**:
```css
/* ❌ Hard to read */
body {
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  line-height: 1.2;
}

/* ✅ Readable */
body {
  font-size: 16px;
  color: #333;
  background: #fff;
  line-height: 1.5;
}
```

**Verification**:
- Zoom to 200% — text still readable
- Check contrast with WebAIM Contrast Checker
- Test with screen reader
- Test with color blindness simulator

---

### Pattern 2: Operable Navigation

**Outcome**: Users can navigate the interface.

**Barriers**:
- No keyboard support
- No focus indicators
- Keyboard traps
- Tiny touch targets

**Remediation**:
```html
<!-- ❌ Not operable -->
<div onclick="navigate('/page')">Click me</div>

<!-- ✅ Operable -->
<button onclick="navigate('/page')">Click me</button>

<!-- ✅ With focus indicator -->
<button onclick="navigate('/page')" style="outline: 3px solid blue;">
  Click me
</button>
```

**Verification**:
- Tab through interface — all interactive elements reachable
- Verify focus indicator visible
- Test with keyboard only
- Test with screen reader

---

### Pattern 3: Understandable Error Handling

**Outcome**: Users can recover from errors.

**Barriers**:
- Unclear error messages
- No suggestion for fix
- Error not announced
- Error not associated with field

**Remediation**:
```html
<!-- ❌ Not understandable -->
<input type="email" id="email">
<p>Invalid input</p>

<!-- ✅ Understandable -->
<label for="email">Email address</label>
<input type="email" id="email" aria-invalid="true" aria-describedby="email-error">
<p id="email-error" role="alert">
  Please enter a valid email (e.g., name@example.com)
</p>
```

**Verification**:
- Error message is clear and specific
- Error is announced to screen readers
- Error is associated with field
- Suggestion for fix is provided

---

### Pattern 4: Robust Semantic HTML

**Outcome**: Assistive tech can understand content.

**Barriers**:
- Custom components without ARIA
- Missing semantic HTML
- Incorrect roles
- Missing accessible names

**Remediation**:
```html
<!-- ❌ Not robust -->
<div onclick="submit()">Submit</div>

<!-- ✅ Robust -->
<button type="submit">Submit</button>

<!-- ✅ Custom component with ARIA -->
<div role="button" tabindex="0" onclick="submit()" aria-label="Submit form">
  Submit
</div>
```

**Verification**:
- Test with screen reader (NVDA, JAWS, VoiceOver)
- Validate HTML
- Check ARIA implementation
- Verify accessible names

---

## Outcome-Focused Audit Checklist

### Perceivable
- [ ] Text is readable (size, contrast, font)
- [ ] Images have text alternatives
- [ ] Audio has captions/transcripts
- [ ] Video has audio description
- [ ] Color is not the only way to convey information
- [ ] Content doesn't flash/strobe
- [ ] Users can zoom to 200%

### Operable
- [ ] All functionality available via keyboard
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Touch targets are 24×24px minimum
- [ ] No time limits (or can be extended)
- [ ] Gestures have single-pointer alternatives
- [ ] Skip links available

### Understandable
- [ ] Language is clear and simple
- [ ] Navigation is consistent
- [ ] Behavior is predictable
- [ ] Error messages are helpful
- [ ] Instructions are clear
- [ ] Form labels are associated

### Robust
- [ ] Semantic HTML used
- [ ] ARIA roles are correct
- [ ] Accessible names provided
- [ ] HTML is valid
- [ ] Works with screen readers
- [ ] Works with assistive tech

---

## Outcome-Focused vs Compliance-Focused Comparison

| Aspect | WCAG 2.1 (Compliance) | WCAG 3.0 (Outcomes) |
|--------|----------------------|-------------------|
| **Focus** | Criteria checklist | User outcomes |
| **Question** | "Did we meet criterion X?" | "Can users achieve their goal?" |
| **Measurement** | Pass/fail per criterion | Outcome achievable/blocked |
| **Remediation** | "Add aria-label" | "Users can understand the button's purpose" |
| **Scope** | Technical requirements | User experience |
| **Flexibility** | Strict rules | Principle-based |
| **Testing** | Automated tools + manual | User testing + assistive tech |

---

## When to Use Each Framework

**Use WCAG 2.1 (Compliance) when:**
- Legal/regulatory compliance required
- Audit trail needed
- Specific criterion violations must be documented
- Compliance certification required

**Use WCAG 3.0 (Outcomes) when:**
- Designing for real user needs
- Prioritizing impact over compliance
- Iterating on accessibility
- Building inclusive products

**Best practice**: Use both
- WCAG 2.1 for compliance baseline
- WCAG 3.0 for user-centered design
- Map outcomes to criteria for documentation

---

## Resources

- [WCAG 3.0 Draft](https://www.w3.org/TR/wcag-3.0/)
- [WCAG 3.0 Explainer](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/)
- [Outcome-Focused Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/#outcomes)
