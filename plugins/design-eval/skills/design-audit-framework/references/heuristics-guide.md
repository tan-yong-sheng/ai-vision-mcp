# Nielsen's 10 Usability Heuristics - Detailed Guide

## Heuristic 1: Visibility of System Status

**Principle:** Users should always know what's happening and what system is doing.

**Key Points:**
- Provide real-time feedback
- Use clear, familiar language
- Keep users informed of progress
- Respond within reasonable time (ideally < 1 second, max 10 seconds)

**Examples:**
- Loading spinners or progress bars for long operations
- Status messages for form submissions
- Real-time validation feedback
- Breadcrumbs showing current location
- Last update timestamps
- Active/inactive state indicators

**Evaluation Questions:**
- Is it clear what state the system is in?
- Does the system provide feedback for all user actions?
- Are there confusing delays or missing feedback?
- Can users understand the current progress?

---

## Heuristic 2: Match Between System and Real World

**Principle:** System should speak user's language using real-world conventions.

**Key Points:**
- Use familiar terminology
- Follow real-world conventions
- Match user mental models
- Avoid technical jargon
- Use familiar metaphors

**Examples:**
- "Save" instead of "Persist"
- "Delete" instead of "Remove from database"
- Shopping cart analogy for e-commerce
- Filing cabinet metaphor for document organization
- Trash/Recycle bin for deleted items

**Evaluation Questions:**
- Would a typical user understand the terminology?
- Are conventions followed (e.g., magnifying glass for search)?
- Are mental models matched (what users expect to happen)?
- Is jargon minimized?

---

## Heuristic 3: User Control and Freedom

**Principle:** Users need emergency exits and shouldn't feel trapped.

**Key Points:**
- Support undo and redo
- Provide clear exit routes (cancel, back, close)
- Don't force specific workflows
- Allow users to interrupt operations
- Provide shortcuts for power users

**Examples:**
- Undo/Redo for content editing
- Cancel buttons on dialogs and forms
- Back button in navigation
- Search cancel (X button)
- Keyboard shortcuts (Ctrl+Z for undo)
- Quick exit paths (Home button, logo click)

**Evaluation Questions:**
- Can users undo recent actions?
- Are there clear exit options?
- Can users go back or change direction?
- Is there a way to stop ongoing operations?

---

## Heuristic 4: Error Prevention and Recovery

**Principle:** Prevent problems before they occur; when they do, help users recover.

**Key Points:**
- Prevent errors through constraints and confirmations
- Use clear error messages
- Suggest solutions
- Prevent serious errors with confirmations
- Design for graceful recovery

**Examples:**
- Input validation (email format, date range)
- Confirmation dialogs for destructive actions ("Delete 50 files?")
- Disabled buttons when form is incomplete
- Form field constraints (max length, allowed characters)
- Clear error messages with suggestions
- Auto-save and recovery options

**Evaluation Questions:**
- Are errors prevented where possible?
- Do error messages explain the problem clearly?
- Are solutions suggested?
- Is recovery easy after an error?

---

## Heuristic 5: Recognition vs Recall

**Principle:** Make options visible; minimize memory load.

**Key Points:**
- Make objects and options visible
- Don't require users to remember information
- Provide reminders and suggestions
- Use progressive disclosure
- Support scanning and browsing

**Examples:**
- Visible navigation instead of hidden menus
- Autocomplete suggestions
- Search history
- Clear labeling of options
- Icons with labels
- Dropdown menus instead of typed commands
- Examples and templates

**Evaluation Questions:**
- Are all options visible or easily discoverable?
- Can users find what they need without remembering?
- Are labels clear and descriptive?
- Is there visual support (icons, examples)?

---

## Heuristic 6: Flexibility and Efficiency

**Principle:** Accelerators for experts; support customization.

**Key Points:**
- Provide shortcuts for frequent actions
- Allow customization and personalization
- Support advanced workflows
- Speed up interactions for experienced users
- Allow batch operations

**Examples:**
- Keyboard shortcuts (Ctrl+S for save)
- Drag-and-drop operations
- Custom keyboard bindings
- Customizable dashboards
- Batch operations (select multiple and act)
- Recent/frequent lists
- Macros or automation

**Evaluation Questions:**
- Can experienced users work faster?
- Are common tasks shortcut-able?
- Can users customize their workspace?
- Are there advanced features for power users?

---

## Heuristic 7: Aesthetic and Minimalist Design

**Principle:** Remove unnecessary information; focus on essentials.

**Key Points:**
- Eliminate clutter
- Focus attention on important elements
- Use progressive disclosure
- Prioritize content
- Clean visual hierarchy
- Use white space effectively

**Examples:**
- Minimal, focused homepage
- Progressive disclosure (reveal details on demand)
- Prioritized search results
- Clean forms (only required fields visible)
- Modal dialogs for focused tasks
- Consistent visual hierarchy

**Evaluation Questions:**
- Is there unnecessary visual clutter?
- Are the most important elements prominent?
- Can secondary information be hidden initially?
- Is the layout clean and organized?

---

## Heuristic 8: Help and Documentation

**Principle:** Provide searchable, task-focused help when needed.

**Key Points:**
- Make help easy to find
- Task-focused (help for what users want to do)
- Concrete steps to follow
- Keep it concise
- Support multiple formats

**Examples:**
- Contextual help (? icon)
- Tooltips for controls
- In-app onboarding tours
- Help center with search
- Keyboard shortcut reminders
- Video tutorials
- FAQ sections

**Evaluation Questions:**
- Is help easily accessible?
- Is help task-focused?
- Are steps concrete and actionable?
- Is help easily searchable?

---

## Heuristic 9: Error Messages (Related to Heuristic 4)

**Principle:** Use plain language; suggest solutions.

**Key Points:**
- Explain the problem in user's terms
- Use non-threatening language
- Suggest a solution or next step
- Be specific about what went wrong
- Use humble tone

**Bad Example:** "Invalid input"  
**Good Example:** "Email address must include @ symbol (e.g., user@example.com)"

**Bad Example:** "Error 403"  
**Good Example:** "You don't have permission to access this folder. Contact your administrator."

---

## Heuristic 10: System Flexibility

**Principle:** Support multiple ways to accomplish goals.

**Key Points:**
- Multiple navigation paths
- Support different user types
- Allow different workflows
- Accommodate user preferences
- Don't force one way

**Examples:**
- Search and browse both available
- Keyboard and mouse support
- Grid and list view options
- Light and dark modes
- Multiple language support
- Adjustable text size

**Evaluation Questions:**
- Are multiple navigation paths available?
- Can different user types accomplish their goals?
- Are user preferences respected?
- Is there flexibility in how tasks are done?

---

## Audit Process

When evaluating against heuristics:

1. **Review each heuristic** - Is the interface consistent?
2. **Identify violations** - Where does it fail?
3. **Assess severity** - How bad is the violation?
4. **Suggest improvements** - What would fix it?
5. **Prioritize** - What matters most to users?

**Severity Scale:**
- **Catastrophic** - Blocks core functionality
- **Major** - Significantly impacts usability
- **Minor** - Noticeable but not blocking
- **Cosmetic** - Minor issue, low impact
