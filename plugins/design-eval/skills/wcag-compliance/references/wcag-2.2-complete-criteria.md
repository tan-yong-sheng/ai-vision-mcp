# WCAG 2.2 Complete Criteria Reference

Complete reference of all 78 WCAG 2.2 success criteria organized by level and principle. Use this for compliance auditing and mapping findings to specific criteria.

---

## Level A (Minimum - 30 criteria)

### Perceivable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **1.1.1** Non-text Content | All images, icons have text alternatives | Missing alt text, decorative images have alt="image" |
| **1.2.1** Audio-only/Video-only | Provide transcript or audio description | Video without captions, audio without transcript |
| **1.2.2** Captions | Video with audio has captions | Unlabeled dialogue, missing speaker identification |
| **1.2.3** Audio Description | Pre-recorded video has audio description | Important visual details not described |
| **1.3.1** Info and Relationships | Information conveyed through presentation is available programmatically | Layout-dependent structure, visual-only relationships |
| **1.3.2** Meaningful Sequence | Reading order is logical | Tab order jumps around, reflow breaks structure |
| **1.3.3** Sensory Characteristics | Instructions don't rely solely on shape, color, size, location, orientation, or sound | "Click the red button" without text alternative |
| **1.4.1** Use of Color | Color is not the only visual means of conveying information | Red/green status without text or icon |
| **1.4.2** Audio Control | Audio playing automatically can be paused/stopped | Auto-play video with sound, no pause control |

### Operable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **2.1.1** Keyboard | All functionality available via keyboard | Mouse-only drag-and-drop, hover-only menus |
| **2.1.2** No Keyboard Trap | Keyboard focus can be moved away from any component | Modal without Escape key, focus stuck in iframe |
| **2.1.4** Character Key Shortcuts | Single-key shortcuts can be turned off or remapped | Alt+A triggers action globally, conflicts with browser shortcuts |
| **2.2.1** Timing Adjustable | Time limits can be extended | Session timeout without warning or extension option |
| **2.2.2** Pause, Stop, Hide | Moving/blinking content can be paused | Carousel autoplays, blinking text, scrolling marquee |
| **2.3.1** Three Flashes | Nothing flashes more than 3 times per second | Animated GIF flashing > 3 Hz, strobe effect |
| **2.4.1** Bypass Blocks | Skip link or landmark navigation available | No skip link, repeated navigation on every page |
| **2.4.2** Page Titled | Pages have descriptive titles | `<title>Untitled</title>`, generic "Page 1" |
| **2.4.3** Focus Order | Focus order preserves meaning | Tab order goes right-to-left, jumps around |
| **2.4.4** Link Purpose | Link purpose clear from link text or context | "Click here", "Read more" without context |
| **2.5.1** Pointer Gestures | Multi-point gestures have single-pointer alternatives | Pinch-to-zoom only, no single-finger alternative |
| **2.5.2** Pointer Cancellation | Down-event doesn't trigger action (use up-event or click) | onMouseDown triggers submit, can't undo before release |
| **2.5.3** Label in Name | Accessible name contains visible label text | Aria-label doesn't match visible text |
| **2.5.4** Motion Actuation | Motion-triggered functions have alternatives | Shake to undo, tilt to scroll, no button alternative |

### Understandable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **3.1.1** Language of Page | Default language specified in HTML | `<html>` missing lang attribute, wrong language |
| **3.2.1** On Focus | Focus doesn't trigger unexpected changes | Focus changes page, opens popup, submits form |
| **3.2.2** On Input | Input doesn't trigger unexpected changes | Typing in field submits form, changes other fields |
| **3.2.6** Consistent Help | Help mechanisms appear in the same relative order across pages | Help link in footer on page 1, header on page 2 |
| **3.3.1** Error Identification | Input errors clearly described | "Invalid input" without specifying which field or why |
| **3.3.2** Labels or Instructions | Form inputs have labels or instructions | Input without label, placeholder only |
| **3.3.7** Redundant Entry | Information previously entered is auto-populated or available to select | Re-enter address on subsequent pages |

### Robust

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **4.1.2** Name, Role, Value | UI components have accessible names and correct roles | Button missing aria-label, custom select missing role |

---

## Level AA (Standard - 30 criteria)

Includes all Level A criteria plus:

### Perceivable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **1.2.4** Captions (Live) | Live audio has captions | Live stream without real-time captions |
| **1.2.5** Audio Description | Pre-recorded video has audio description (or alternative) | Detailed visual action not described |
| **1.3.4** Orientation | Content doesn't restrict orientation | App locks to portrait, breaks on landscape |
| **1.3.5** Identify Input Purpose | Input purpose can be programmatically determined | Custom number input for zip code, autocomplete can't fill |
| **1.4.3** Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large text, 3:1 for UI components | Gray text on white (2.5:1), disabled button too light |
| **1.4.4** Resize Text | Text can be resized to 200% without loss of functionality | Text overflow, layout breaks at 200% zoom |
| **1.4.5** Images of Text | Text used instead of images of text | Logo with text inside image, no alt text |
| **1.4.10** Reflow | Content reflows at 320px width without horizontal scroll | Horizontal scrolling on mobile, fixed-width layout |
| **1.4.11** Non-text Contrast | UI components have 3:1 contrast | Icon on background (1.5:1), button border too faint |
| **1.4.12** Text Spacing | Content adapts to text spacing changes | Line-height adjusted breaks layout, text overlaps |
| **1.4.13** Content on Hover/Focus | Additional content is dismissible, hoverable, persistent | Tooltip appears on hover only, disappears when moving mouse to it |

### Operable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **2.4.5** Multiple Ways | Multiple ways to find pages | Only search available, no sitemap or navigation |
| **2.4.6** Headings and Labels | Headings and labels are descriptive | `<h2>Content</h2>`, generic button labels |
| **2.4.7** Focus Visible | Focus indicator is visible | Focus outline removed with no replacement, `:focus { outline: none }` |
| **2.4.11** Focus Not Obscured (Minimum) | Focused element is not entirely hidden by author-created content | Focus hidden behind sticky header, modal shadow |
| **2.5.7** Dragging Movements | Dragging actions have single-pointer alternatives | Drag to reorder without buttons, no keyboard alternative |
| **2.5.8** Target Size (Minimum) | Interactive targets are at least 24×24 CSS pixels (with exceptions) | Small button (18×18), close icon too small |

### Understandable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **3.1.2** Language of Parts | Language changes are marked | French paragraph without `lang="fr"` |
| **3.2.3** Consistent Navigation | Navigation is consistent across pages | Menu layout changes between pages |
| **3.2.4** Consistent Identification | Same functionality uses same labels | "Search" on home, "Find" on products page |
| **3.3.3** Error Suggestion | Error corrections suggested when known | "Invalid email" without suggesting correct format |
| **3.3.4** Error Prevention (Legal) | Actions can be reversed or confirmed | Delete without confirmation, can't undo |
| **3.3.8** Accessible Authentication (Minimum) | No cognitive function test for login unless alternative provided | CAPTCHA-only verification, no audio alternative |

### Robust

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **4.1.3** Status Messages | Status messages announced to screen readers | Loading message appears but not announced, success silently happens |

---

## Level AAA (Enhanced - 18 criteria)

Includes all Level A and AA criteria plus:

### Perceivable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **1.4.6** Contrast (Enhanced) | 7:1 for normal text, 4.5:1 for large text | Gray text on white (5:1), doesn't meet enhanced standard |
| **1.4.8** Visual Presentation | Foreground/background colors can be selected | Fixed color scheme, doesn't respect system preferences |
| **1.4.9** Images of Text (No Exception) | No images of text | Logo as image, no fallback text |

### Operable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **2.1.3** Keyboard (No Exception) | All functionality keyboard accessible | Drag-drop without keyboard, hover-only interactions |
| **2.2.3** No Timing | No time limits | Session timeout, real-time multiplayer games |
| **2.2.4** Interruptions | Interruptions can be postponed | Notifications interrupt, can't postpone |
| **2.2.5** Re-authenticating | Data preserved on re-authentication | Form clears after re-login, lose place in workflow |
| **2.2.6** Timeouts | Users warned about data loss from inactivity | Silently log out, lose form data |
| **2.3.2** Three Flashes | No content flashes more than 3 times per second | Video with brief flash, animated transition |
| **2.3.3** Animation from Interactions | Motion animation can be disabled | Parallax, smooth scroll with no prefers-reduced-motion support |
| **2.4.8** Location | User location within site is available | No breadcrumbs, can't tell where you are |
| **2.4.9** Link Purpose (Link Only) | Link purpose clear from link text alone | "Read more" without context, out-of-context links |
| **2.4.10** Section Headings | Sections have headings | Content blocks without headings |
| **2.4.12** Focus Not Obscured (Enhanced) | No part of focused element is hidden | Focus partially hidden by sticky header |
| **2.4.13** Focus Appearance | Focus indicator has sufficient area, contrast, and is not obscured | Tiny focus outline (1px), low contrast with background |

### Understandable

| Criterion | Description | Common Issues |
|-----------|-------------|----------------|
| **3.1.3** Unusual Words | Definitions available for unusual words | Jargon without explanation, acronyms not expanded |
| **3.1.4** Abbreviations | Abbreviations expanded | "WCAG" without expansion on first use |
| **3.1.5** Reading Level | Alternative content for complex text | Dense academic text without summary |
| **3.1.6** Pronunciation | Pronunciation available where needed | Foreign name without pronunciation guide |
| **3.2.5** Change on Request | Changes initiated only by user | Page content changes automatically, no user action |
| **3.3.5** Help | Context-sensitive help available | No help system, generic documentation |
| **3.3.6** Error Prevention (All) | All form submissions can be reviewed | Multi-step form auto-advances without review |
| **3.3.9** Accessible Authentication (Enhanced) | No cognitive function test for login (no exceptions) | Biometric-only login, no alternative method |

---

## What Changed from WCAG 2.1 to 2.2

| Change | Criterion | Level |
|--------|-----------|-------|
| **Removed** | 4.1.1 Parsing | A |
| **Added** | 2.4.11 Focus Not Obscured (Minimum) | AA |
| **Added** | 2.4.12 Focus Not Obscured (Enhanced) | AAA |
| **Added** | 2.4.13 Focus Appearance | AAA |
| **Added** | 2.5.7 Dragging Movements | AA |
| **Added** | 2.5.8 Target Size (Minimum) | AA |
| **Added** | 3.2.6 Consistent Help | A |
| **Added** | 3.3.7 Redundant Entry | A |
| **Added** | 3.3.8 Accessible Authentication (Minimum) | AA |
| **Added** | 3.3.9 Accessible Authentication (Enhanced) | AAA |

---

## Mapping Criteria to Principles

### Perceivable (1.x - 9 criteria at AA)
Information and user interface components must be presentable to users in ways they can perceive.

### Operable (2.x - 14 criteria at AA)
User interface components and navigation must be operable.

### Understandable (3.x - 16 criteria at AA)
Information and user interface operation must be understandable.

### Robust (4.x - 1 criterion at AA)
Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.

---

## Testing Tools Reference

| Tool | Type | Coverage |
|------|------|----------|
| axe DevTools | Browser extension | Automated checks for multiple criteria |
| WAVE | Browser extension | Visual annotations, error/warning/notice identification |
| Lighthouse | Built into Chrome DevTools | Accessibility score, specific criterion checks |
| NVDA | Screen reader (Windows) | Perceivable, Operable, Robust testing |
| JAWS | Screen reader (Windows) | Premium alternative, high market share |
| VoiceOver | Screen reader (Mac/iOS) | Native accessibility testing |
| Colour Contrast Analyser | Desktop app | Precise contrast ratio measurement |
| WebAIM | Online tool | Contrast checker, link checker |

---

## Remediation by Severity

### Critical (Blocks access)
- No keyboard navigation
- No text alternatives for images
- No form labels
- Broken focus management
- Unreadable text (too small or low contrast)

### High (Major impact)
- Missing heading hierarchy
- Non-descriptive link text
- No error messages or suggestions
- Poor focus visibility
- Color-only information

### Medium (Noticeable impact)
- Inconsistent navigation
- Minor contrast issues (> 3:1 but < 4.5:1)
- Missing alt text on decorative images
- No skip link

### Low (Minor impact)
- Page title not descriptive enough
- Language not marked for non-English content
- Help link in wrong location

---

## Sources

- [WCAG 2.2 W3C Recommendation](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [WCAG 2.2 Techniques](https://www.w3.org/WAI/WCAG22/Techniques/)
