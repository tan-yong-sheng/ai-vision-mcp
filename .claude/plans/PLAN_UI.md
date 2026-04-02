# PLAN.md - GrowChat Markdown Parity with Open-WebUI

## Goal
Replicate the Open-WebUI chat markdown experience in GrowChat, starting with core markdown parity only.

This means:
- preserve raw model output as-is
- change rendering only
- match Open-WebUI-style code blocks closely
- support paragraphs, headings, lists, links, inline code, fenced code blocks, blockquotes, and tables in phase 1
- keep single newline and double newline behavior explicit

## Rendering Contract
This plan uses the following text behavior:

- single newline: soft wrap inside the same paragraph
- double newline: new paragraph

Examples:

```md
Hello world
this stays the same paragraph
```

renders like:

Hello world this stays the same paragraph

```md
Hello world

This becomes a new paragraph.
```

renders like:

Hello world

This becomes a new paragraph.

## Why Token-Based Rendering
Open-WebUI does not treat markdown as one flat HTML blob. It tokenizes markdown and renders each token type separately.

That matters because:
- code blocks can get their own toolbar
- tables can scroll horizontally without breaking the whole message
- inline code can be styled and copied consistently
- blockquotes can be upgraded later into alerts
- the UI is easier to test because each markdown feature maps to one token branch

In contrast, an HTML string renderer just calls `marked.parse(...)` and injects the whole output at once. That is simpler, but it makes code-block UI, table behavior, and fine-grained spacing harder to control.

## Open-WebUI Reference Map

### 1) Markdown entry point
File: `open-webui/src/lib/components/chat/Messages/Markdown.svelte`

What it does:
- preprocesses content
- caches the last content
- tokenizes with `marked.lexer(...)`
- throttles parsing while streaming with `requestAnimationFrame`

Short extract:
```svelte
tokens = marked.lexer(processed);
```

```svelte
pendingUpdate = requestAnimationFrame(() => {
  parseTokens();
});
```

### 2) Block token renderer
File: `open-webui/src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte`

What it does:
- routes token types to dedicated UI
- renders code blocks, tables, lists, blockquotes, details, HTML, paragraphs, and text
- keeps table layout and code blocks isolated from the rest of the message

Short extract:
```svelte
{:else if token.type === 'code'}
```

```svelte
{:else if token.type === 'table'}
```

```svelte
{:else if token.type === 'paragraph'}
```

### 3) Inline token renderer
File: `open-webui/src/lib/components/chat/Messages/Markdown/MarkdownInlineTokens.svelte`

What it does:
- renders inline links, images, strong, emphasis, code spans, line breaks, mentions, citations, and footnotes
- allows internal navigation for app links

Short extract:
```svelte
{:else if token.type === 'codespan'}
```

```svelte
{:else if token.type === 'link'}
```

```svelte
{:else if token.type === 'mention'}
```

### 4) Code block UI
File: `open-webui/src/lib/components/chat/Messages/CodeBlock.svelte`

What it does:
- syntax highlighting
- copy button
- collapse toggle
- optional edit and preview actions
- optional execution hooks in Open-WebUI

Short extract:
```svelte
import hljs from 'highlight.js';
```

```svelte
const collapseCodeBlock = () => {
  collapsed = !collapsed;
};
```

### 5) Shared markdown styles
File: `open-webui/src/app.css`

What it does:
- defines markdown typography classes
- applies tight spacing for paragraphs, lists, and blockquotes
- styles inline code spans
- keeps list paragraphs from stacking too much vertical space

Short extract:
```css
.markdown-prose {
  @apply prose ... whitespace-pre-line;
}
```

```css
.codespan {
  @apply font-mono rounded-md ...;
}
```

```css
li p {
  display: inline;
}
```

### 6) Math delimiter parity
Open-WebUI accepts more math delimiters than GrowChat did before this patch.

```text
+-----------------------------+--------------------------------------+-------------------+
| Form                        | Example                              | GrowChat status   |
+-----------------------------+--------------------------------------+-------------------+
| display math                | $$                                   | supported         |
|                             |   a^2 + b^2 = c^2                    |                   |
|                             | $$                                   |                   |
| display math                | \[                                   | supported         |
|                             |   a^2 + b^2 = c^2                    |                   |
|                             | \]                                   |                   |
| display math                | \begin{equation}                     | supported         |
|                             |   a^2 + b^2 = c^2                    |                   |
|                             | \end{equation}                       |                   |
| inline math                 | \(a^2 + b^2 = c^2\)                  | not yet           |
| inline math                 | $a^2 + b^2 = c^2$                    | not yet           |
+-----------------------------+--------------------------------------+-------------------+
```

GrowChat now renders unsupported full TeX documents as normal code blocks instead of forcing the KaTeX `Preview` shell:

```text
\documentclass{article}
\begin{document}
Hello
\end{document}
```

That stays a fenced `latex` code block, like `python` or `json`, rather than a previewable math block.

## Open-WebUI Features To Mirror In Phase 1

### Content
- headings
- paragraphs
- single newline soft wrap
- double newline paragraph break
- bold, italic, strikethrough
- inline code
- fenced code blocks
- links
- images
- lists
- blockquotes
- tables

### UI
- message body typography similar to Open-WebUI markdown prose
- code blocks with copy button
- code blocks with collapse toggle
- code blocks with syntax highlighting
- table container with horizontal overflow handling
- inline code as pill-style monospace text

### Not in phase 1
- inline math delimiters (`\( ... \)`, `$ ... $`)
- Mermaid
- Graphviz
- tool call rendering
- mentions
- citations
- footnotes
- details/summary
- HTML embed special cases
- full LaTeX document compilation

## GrowChat Phase 1 Plan

### Step 1 - Keep raw output unchanged
Do not normalize or rewrite the model content before rendering.
Render what the model produced, with only markdown parsing applied.

### Step 2 - Move to token-based rendering
Replace the current flat HTML-string approach with a token-driven renderer:
- parse with `marked.lexer(...)`
- render each token type separately
- keep paragraphs, code blocks, and tables isolated

### Step 3 - Add markdown style classes
Add Open-WebUI-like prose classes in GrowChat CSS:
- `.markdown-prose`
- `.markdown-prose-sm`
- `.codespan`

Also keep:
- `li p { display: inline; }`
- minimal paragraph spacing
- safe wrapping for long lines and code blocks

### Step 4 - Build code block UI
Match Open-WebUI behavior closely:
- syntax highlight the code block
- show copy action
- show collapse action
- keep toolbar visible and compact
- maintain good mobile fit

### Step 5 - Add table rendering
Tables should:
- render as actual tables
- scroll horizontally when needed
- keep headers and cells readable
- not stretch the whole chat row off screen

### Step 6 - Preserve streaming performance
While the assistant is streaming:
- avoid repeated full re-renders on identical content
- parse at most once per animation frame
- keep the UI responsive during long responses

## Tests To Add

### Unit tests
- markdown paragraph splitting
- single newline soft wrap behavior
- double newline paragraph break behavior
- fenced code block rendering
- table rendering
- inline code rendering
- code block toolbar presence

### E2E tests
- long assistant message stays inside viewport on mobile and tablet
- code blocks show copy and collapse UI
- tables do not overflow the page
- paragraph spacing matches the rendering contract

## ASCII Render Examples

### Paragraph
Input:
```md
Hello world

This is a new paragraph.
```

Rendered:
```text
Hello world

This is a new paragraph.
```

### Soft wrap
Input:
```md
Hello world
this continues the same paragraph.
```

Rendered:
```text
Hello world this continues the same paragraph.
```

### Code block
Input:
```text
    ```js
    const name = "GrowChat";
    console.log(name);
    ```
```

Rendered:
```text
+--------------------------------------+
| js                           [Copy]  |
|                               [v]    |
+--------------------------------------+
| const name = "GrowChat";             |
| console.log(name);                   |
+--------------------------------------+
```

### Table
Input:
```md
| Name | Value |
| ---- | ----- |
| A    | 10    |
| B    | 20    |
```

Rendered:
```text
+------+-------+
| Name | Value |
+------+-------+
| A    | 10    |
| B    | 20    |
+------+-------+
```

### List
Input:
```md
- One
- Two
- Three
```

Rendered:
```text
- One
- Two
- Three
```

### Blockquote
Input:
```md
> This is a quoted note.
```

Rendered:
```text
> This is a quoted note.
```

### KaTeX
Phase: later

Scope:
- render math snippets only
- do not attempt full LaTeX document compilation in chat markdown
- full TeX documents stay as normal code blocks
- match Open-WebUI delimiter-based behavior
- share the current Preview/Code state across supported special blocks in the active chat thread
- use the renderer's raw parse error when math syntax is invalid

Input:
```md
$$E = mc^2$$
```

Rendered:
```text
┌──────────────────────────────┐
│ Preview | Code   Copy Collapse│
├──────────────────────────────┤
│ Preview                      │
│                              │
│          E = mc²             │
└──────────────────────────────┘
```

Unsupported full document example:
```md
\documentclass{article}
\begin{document}
P(A|B) = \frac{P(B|A)P(A)}{P(B)}
\end{document}
```

Rendered:
```text
\documentclass{article}
\begin{document}
P(A|B) = \frac{P(B|A)P(A)}{P(B)}
\end{document}
```

UI rule:
- default to `Preview` for valid math
- one toggle updates every supported special block in the active chat thread
- reset to `Preview` when the chat thread changes or the page reloads
- keep full documents as plain code blocks
- disable `Preview` when parsing fails
- show the raw renderer error directly under the code area for supported math snippets

### Mermaid
Phase: later

Input (source):
    ```mermaid
    graph TD
      A[User] --> B[Chat]
      B --> C[LLM]
    ```

Rendered:
```text
┌──────────────────────────────┐
│ [User] --> [Chat] --> [LLM]  │
└──────────────────────────────┘
```

UI rule:
- default to `Preview`
- share the same chat-scoped `Preview`/`Code` toggle
- disable `Preview` when parsing fails
- show the raw renderer error directly under the code area

### Graphviz
Phase: later

Input (source):
    ```dot
    digraph G { A -> B; B -> C; }
    ```

Rendered:
```text
┌──────────────────────────────┐
│ [A] ---> [B] ---> [C]        │
└──────────────────────────────┘
```

UI rule:
- default to `Preview`
- share the same chat-scoped `Preview`/`Code` toggle
- disable `Preview` when parsing fails
- show the raw renderer error directly under the code area

### Tool Call Rendering
Phase: later

Input:
```text
tool: web.search
status: running
args: {"query":"GrowChat"}
```

Rendered:
```text
+----------------------------------+
| Tool: web.search                 |
| Status: running                  |
| Args: query = "GrowChat"         |
|                                  |
| [Copy] [Expand] [Retry]          |
+----------------------------------+
```

## Rollout Order

1. Add token-based markdown renderer
2. Add markdown typography classes
3. Add code block UI
4. Add table rendering and overflow handling
5. Lock behavior with unit and E2E tests
6. Add KaTeX math rendering for snippets, Mermaid, Graphviz, and tool-call blocks in a later phase
7. Then decide whether to add Open-WebUI extras in a later phase

## Final Constraint
Do not add content normalization that changes the model output text.
The only allowed change in phase 1 is how the content is rendered.
