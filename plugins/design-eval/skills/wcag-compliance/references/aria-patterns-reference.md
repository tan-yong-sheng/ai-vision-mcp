# ARIA Patterns Reference

Consolidated patterns for implementing ARIA correctly. Use these patterns as foundation for accessible custom components and to verify existing implementations.

---

## ARIA Fundamentals

**Core Principle**: Use semantic HTML first. ARIA is for when HTML doesn't provide what you need.

```html
<!-- ✅ Prefer semantic HTML -->
<button>Click me</button>
<a href="/page">Link</a>
<nav>Navigation</nav>
<main>Main content</main>

<!-- Only use ARIA when semantic HTML unavailable -->
<div role="button" tabindex="0">Custom button</div>
```

**Three Types of ARIA**:
1. **Roles** — What is it? (`role="button"`)
2. **States** — What is its condition? (`aria-pressed="true"`)
3. **Properties** — What are its characteristics? (`aria-label="Close"`)

---

## Pattern 1: Button (Standard)

**Use when**: Triggering actions, submitting forms, toggling state.

```html
<button type="button">Click me</button>

<!-- With icon -->
<button aria-label="Close dialog">×</button>

<!-- Toggle button -->
<button aria-pressed="false" aria-label="Mute">
  🔊
</button>

<script>
  const toggleBtn = document.querySelector('[aria-label="Mute"]');
  toggleBtn.addEventListener('click', () => {
    const isPressed = toggleBtn.getAttribute('aria-pressed') === 'true';
    toggleBtn.setAttribute('aria-pressed', !isPressed);
    // Update visual state
  });
</script>
```

**Keyboard Support**:
- Enter: Activate button
- Space: Activate button

**Screen Reader**:
- Announces "Button: Click me"
- For toggle: "Button: Mute, toggle button, pressed" or "unpressed"

---

## Pattern 2: Button (Custom with ARIA)

**Use when**: Using `<div>` or other element as button.

```html
<div role="button" tabindex="0" aria-label="Save document">
  Save
</div>

<script>
  const btn = document.querySelector('[role="button"]');
  
  btn.addEventListener('click', handleSave);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSave();
    }
  });
  
  function handleSave() {
    // Save logic
  }
</script>
```

**Requirements**:
- `role="button"` — Define it as button
- `tabindex="0"` — Make it keyboard accessible
- `aria-label` — Provide accessible name
- Handle Enter and Space key events

---

## Pattern 3: Link

**Standard link**:
```html
<a href="/page">Descriptive link text</a>
```

**External link**:
```html
<a href="https://external.com" target="_blank" rel="noopener">
  External site
  <span class="visually-hidden">(opens in new tab)</span>
</a>
```

**Link with icon**:
```html
<a href="/page" aria-label="Edit user profile">
  <span aria-hidden="true">✎</span>
</a>
```

**Avoid**:
```html
<!-- ❌ Unclear link text -->
<a href="/page">Click here</a>
<a href="/page">Read more</a>

<!-- ✅ Descriptive text -->
<a href="/page">View user profile</a>
<a href="/page">Read case study: XYZ Project</a>
```

---

## Pattern 4: Navigation

**Main navigation**:
```html
<nav aria-label="Main">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<nav aria-label="Secondary">
  <ul>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/resources">Resources</a></li>
  </ul>
</nav>
```

**Key attributes**:
- `aria-label="Main"` — Identify navigation purpose
- `aria-current="page"` — Mark current page
- Multiple nav landmarks with different labels

---

## Pattern 5: Form Field (Basic)

**Explicit label**:
```html
<label for="email">Email address</label>
<input type="email" id="email" name="email" required>
```

**Implicit label** (wrapping):
```html
<label>
  Email address
  <input type="email" name="email" required>
</label>
```

**With instructions**:
```html
<label for="password">Password</label>
<input type="password" id="password" aria-describedby="pwd-hint">
<p id="pwd-hint">Must be at least 8 characters with one number.</p>
```

**Avoid**:
```html
<!-- ❌ No label -->
<input type="email" placeholder="Email">

<!-- ❌ Label not associated -->
<p>Email address</p>
<input type="email">

<!-- ❌ Placeholder only -->
<input type="email" placeholder="Email address">
```

---

## Pattern 6: Form Field (Error State)

**With validation**:
```html
<div class="form-group">
  <label for="email">Email address</label>
  <input 
    type="email" 
    id="email"
    aria-invalid="false"
    aria-describedby="email-hint email-error"
  >
  <p id="email-hint">We'll never share your email.</p>
  <p id="email-error" role="alert">
    <!-- Error appears here -->
  </p>
</div>

<script>
  const input = document.getElementById('email');
  
  input.addEventListener('blur', () => {
    const isValid = input.checkValidity();
    input.setAttribute('aria-invalid', !isValid);
    
    if (!isValid) {
      document.getElementById('email-error').textContent = 
        'Please enter a valid email address (e.g., name@example.com)';
    } else {
      document.getElementById('email-error').textContent = '';
    }
  });
</script>
```

**Key attributes**:
- `aria-invalid="true"` — Mark invalid state
- `aria-describedby="email-error"` — Link to error message
- `role="alert"` — Announce error to screen readers

---

## Pattern 7: Tabs

**Structure**:
```html
<div role="tablist" aria-label="Product information">
  <button 
    role="tab" 
    id="tab-1" 
    aria-selected="true"
    aria-controls="panel-1"
    tabindex="0"
  >
    Description
  </button>
  
  <button 
    role="tab" 
    id="tab-2" 
    aria-selected="false"
    aria-controls="panel-2"
    tabindex="-1"
  >
    Reviews
  </button>
</div>

<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <!-- Description content -->
</div>

<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <!-- Reviews content -->
</div>
```

**JavaScript**:
```javascript
const tablist = document.querySelector('[role="tablist"]');
const tabs = tablist.querySelectorAll('[role="tab"]');

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  
  tab.addEventListener('keydown', (e) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }
    
    e.preventDefault();
    selectTab(newIndex);
  });
});

function selectTab(index) {
  tabs.forEach((tab, i) => {
    const panelId = tab.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    
    if (i === index) {
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      panel.hidden = false;
      tab.focus();
    } else {
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('tabindex', '-1');
      panel.hidden = true;
    }
  });
}
```

**Key attributes**:
- `role="tablist"` — Container for tabs
- `role="tab"` — Individual tab
- `aria-selected="true/false"` — Current tab
- `aria-controls="panel-1"` — Link to content
- `tabindex="0/-1"` — Only selected tab in tab order

**Keyboard**:
- Arrow Right/Left — Move between tabs
- Home/End — First/last tab
- Enter/Space — Activate tab

---

## Pattern 8: Modal Dialog

**Structure**:
```html
<div 
  role="dialog" 
  aria-modal="true" 
  aria-labelledby="dialog-title"
  id="confirm-dialog"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure you want to delete this item?</p>
  <button onclick="confirmDelete()">Delete</button>
  <button onclick="closeDialog()">Cancel</button>
</div>
```

**JavaScript**:
```javascript
function openDialog() {
  const dialog = document.getElementById('confirm-dialog');
  const focusableElements = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  dialog.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Prevent scrolling
  
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDialog();
    }
    
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
  
  firstElement.focus();
}

function closeDialog() {
  const dialog = document.getElementById('confirm-dialog');
  dialog.style.display = 'none';
  document.body.style.overflow = 'auto';
}
```

**Key attributes**:
- `role="dialog"` — Mark as dialog
- `aria-modal="true"` — Block background interaction
- `aria-labelledby="dialog-title"` — Link to title
- Focus trap — Tab cycles through elements, Escape closes

**Note**: Prefer native `<dialog>` element when possible — handles focus trapping and inertness automatically.

```html
<!-- Modern approach -->
<dialog id="confirm-dialog">
  <h2>Confirm Action</h2>
  <p>Are you sure?</p>
  <button onclick="document.getElementById('confirm-dialog').close()">Cancel</button>
</dialog>

<script>
  document.getElementById('confirm-dialog').showModal();
</script>
```

---

## Pattern 9: Live Regions

**Polite announcement** (waits for pause):
```html
<div aria-live="polite" aria-atomic="true" id="status">
  <!-- Status updates announced here -->
</div>

<script>
  function updateStatus(message) {
    const status = document.getElementById('status');
    status.textContent = ''; // Clear
    requestAnimationFrame(() => {
      status.textContent = message;
    });
  }
</script>
```

**Assertive announcement** (interrupts):
```html
<div role="alert" aria-live="assertive">
  <!-- Urgent messages announced immediately -->
</div>

<script>
  function showError(message) {
    const alert = document.querySelector('[role="alert"]');
    alert.textContent = message;
  }
</script>
```

**Status region** (implicit polite):
```html
<div role="status">
  <!-- Status messages (e.g., "3 items selected") -->
</div>
```

**Key attributes**:
- `aria-live="polite"` — Announce when pause in speech
- `aria-live="assertive"` — Announce immediately
- `role="alert"` — High-priority announcement
- `role="status"` — Status update (implicit polite)
- `aria-atomic="true"` — Announce entire region

---

## Pattern 10: Menu (Dropdown)

**Structure**:
```html
<button 
  aria-haspopup="true" 
  aria-expanded="false"
  aria-controls="menu"
>
  Menu
</button>

<ul role="menu" id="menu" hidden>
  <li role="none">
    <a role="menuitem" href="/profile">Profile</a>
  </li>
  <li role="none">
    <a role="menuitem" href="/settings">Settings</a>
  </li>
  <li role="none">
    <hr role="separator">
  </li>
  <li role="none">
    <a role="menuitem" href="/logout">Logout</a>
  </li>
</ul>
```

**JavaScript**:
```javascript
const trigger = document.querySelector('[aria-haspopup="true"]');
const menu = document.getElementById('menu');
const menuItems = menu.querySelectorAll('[role="menuitem"]');

trigger.addEventListener('click', () => {
  const isOpen = menu.hidden === false;
  menu.hidden = !isOpen;
  trigger.setAttribute('aria-expanded', !isOpen);
  if (!isOpen) menuItems[0].focus();
});

menuItems.forEach((item, index) => {
  item.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      menuItems[(index + 1) % menuItems.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      menuItems[(index - 1 + menuItems.length) % menuItems.length].focus();
    } else if (e.key === 'Escape') {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', false);
      trigger.focus();
    }
  });
});
```

**Key attributes**:
- `aria-haspopup="true"` — Button opens menu
- `aria-expanded="true/false"` — Menu open/closed
- `aria-controls="menu"` — Link to menu
- Arrow keys — Navigate menu items
- Escape — Close menu

---

## Pattern 11: Combobox (Autocomplete)

**Basic structure**:
```html
<div role="combobox" aria-owns="listbox" aria-haspopup="listbox">
  <input 
    role="searchbox"
    aria-autocomplete="list"
    aria-expanded="false"
    aria-controls="listbox"
    autocomplete="off"
  >
  <ul role="listbox" id="listbox" hidden>
    <li role="option">Option 1</li>
    <li role="option" aria-selected="true">Option 2</li>
    <li role="option">Option 3</li>
  </ul>
</div>
```

**Keyboard**:
- Arrow Down — Move to next option
- Arrow Up — Move to previous option
- Enter — Select option
- Escape — Close listbox

---

## Pattern 12: Accessible Name

**Every interactive element needs a name**:

```html
<!-- Button -->
<button>Save</button> <!-- Name: "Save" -->

<!-- Button with aria-label -->
<button aria-label="Close dialog">×</button> <!-- Name: "Close dialog" -->

<!-- Link -->
<a href="/page">Home</a> <!-- Name: "Home" -->

<!-- Form field with label -->
<label for="email">Email</label>
<input id="email"> <!-- Name: "Email" -->

<!-- Icon with title -->
<svg aria-label="Heart">
  <use href="#icon-heart"></use>
</svg> <!-- Name: "Heart" -->
```

**Hierarchy** (first match wins):
1. `aria-labelledby` 
2. `aria-label`
3. Text content
4. `title` attribute
5. Placeholder (for inputs only)

---

## Pattern 13: Hide from Screen Readers

**Hide decorative content**:
```html
<!-- Decorative icon (aria-hidden) -->
<span aria-hidden="true">→</span>

<!-- Decorative image (empty alt) -->
<img src="decoration.png" alt="">

<!-- Visually hidden text (screen readers only) -->
<span class="visually-hidden">Learn more about</span>
<a href="/product">Product Name</a>
```

**CSS for visually hidden**:
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Quick Reference: ARIA Attributes

| Attribute | Values | Use |
|-----------|--------|-----|
| `role` | `button`, `tab`, `dialog`, etc. | Define element type |
| `aria-label` | String | Provide accessible name |
| `aria-labelledby` | ID | Link to labeling element |
| `aria-describedby` | ID | Link to description |
| `aria-hidden` | `true`/`false` | Hide from screen readers |
| `aria-expanded` | `true`/`false` | Show/hide state |
| `aria-selected` | `true`/`false` | Tab/option selection |
| `aria-pressed` | `true`/`false` | Toggle button state |
| `aria-current` | `page`, `step`, etc. | Mark current item |
| `aria-disabled` | `true`/`false` | Mark disabled state |
| `aria-invalid` | `true`/`false` | Mark invalid form field |
| `aria-live` | `polite`, `assertive` | Announce changes |
| `aria-atomic` | `true`/`false` | Announce entire region |
| `aria-owns` | ID | Logical parent/child |
| `aria-controls` | ID | Controls another element |
| `aria-haspopup` | `true`, `menu`, `dialog` | Button opens popup |
| `tabindex` | `-1`, `0`, positive | Control tab order |

---

## Testing ARIA Implementation

### With Keyboard
- Tab through all interactive elements
- Arrow keys navigate containers (tabs, menus, lists)
- Enter/Space activate buttons
- Escape close dialogs

### With Screen Reader
- Element name announced correctly
- Role announced (button, tab, dialog, etc.)
- State announced (selected, expanded, pressed, etc.)
- Changes announced (aria-live)

### Tools
- axe DevTools
- WAVE
- Lighthouse
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (Mac)

---

## Common ARIA Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `role="button"` no keyboard | Not operable | Add tabindex, key handlers |
| `aria-label` on link text | Overrides visible text | Use visible text, not aria-label |
| `aria-hidden="true"` on interactive | Interactive element hidden | Use on decorative only |
| Missing `aria-current="page"` | Current page not identified | Mark current nav link |
| Dialog without focus trap | Focus escapes dialog | Trap Tab key, show modal |
| No accessible name | Screen reader says "button" | Add aria-label or text |
| `aria-describedby` loops | Redundant announcement | Point to external description only |

---

## Resources

- [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN ARIA Overview](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM ARIA](https://webaim.org/articles/aria/)
