# Plan: Web Context Detection and HTML Element Classification

**Date**: 2025-01-10
**Author**: Claude Code
**Issue**: Enhance object detection to automatically detect web page contexts and use appropriate HTML element names for better automation compatibility

## Problem Statement

The current object detection system uses generic element names regardless of context:

1. **Context-Agnostic Naming**: Uses "button", "input", "text" for all interfaces (web, mobile, desktop)
2. **Missed Semantic Opportunities**: Web pages could benefit from HTML-specific element names
3. **Automation Mismatch**: Generic names don't align with CSS selector targeting for web automation
4. **Limited Specificity**: Cannot distinguish between HTML input types (text, email, password, etc.)

## Solution: Context-Aware System Instructions

### Core Approach
- **Automatic Web Detection**: Enhance system instructions to identify web page interfaces
- **HTML Element Classification**: Use semantic HTML element names when web context is detected
- **Fallback Mechanism**: Maintain current generic naming for non-web contexts
- **Progressive Enhancement**: Start with basic detection, enhance over time

## Implementation Strategy

### Phase 1: Enhanced System Instructions (Day 1-2)

**Objective**: Modify the detection system instruction to include web context detection logic.

**Key Changes**:
1. **Context Detection Prompting**: Add web interface identification step
2. **HTML Element Vocabulary**: Provide comprehensive HTML element list
3. **Conditional Logic**: Use HTML names for web contexts, generic names otherwise
4. **Input Type Specificity**: Detect specific input types when possible

**Updated System Instruction Structure**:
```
1. CONTEXT DETECTION:
   - Analyze if image shows a web page, browser interface, or web application
   - Look for indicators: address bars, browser UI, web-style layouts, form elements
   - If web context detected → use HTML element names
   - If non-web context → use generic object names

2. HTML ELEMENT CLASSIFICATION (Web Context Only):
   - Interactive Elements: button, input[type], select, textarea, a
   - Form Elements: form, label, fieldset, legend
   - Structural: nav, header, footer, main, section, article
   - Content: h1-h6, p, img, video, ul, ol, li

3. INPUT TYPE DETECTION:
   - Analyze visual cues for input specificity
   - text, email, password, search, tel, url, number, date
   - checkbox, radio, file, submit, reset

4. FALLBACK NAMING:
   - Non-web contexts: button, text, image, icon, object, container
```

### Phase 2: Web Context Indicators (Day 2-3)

**Visual Indicators for Web Detection**:
- **Browser Elements**: Address bar, navigation buttons, tabs, bookmarks bar
- **Web UI Patterns**: Navigation menus, breadcrumbs, pagination, form layouts
- **Typography**: Web fonts, text rendering typical of browsers
- **Layout Patterns**: Grid systems, responsive design indicators, web-style spacing
- **Form Elements**: Standard HTML form controls with web styling

**Detection Logic**:
```typescript
const WEB_CONTEXT_INDICATORS = [
  // Browser UI
  'address bar', 'url bar', 'browser tab', 'bookmark bar',
  'browser window', 'navigation buttons',

  // Web Interface Patterns
  'navigation menu', 'breadcrumb', 'pagination', 'web form',
  'login form', 'search bar', 'dropdown menu', 'checkbox',
  'radio button', 'submit button', 'hyperlink',

  // Layout Patterns
  'web page', 'website', 'web application', 'responsive design',
  'grid layout', 'sidebar', 'header', 'footer', 'navigation'
];
```

### Phase 3: HTML Element Mapping (Day 3-4)

**Interactive Elements** (High Priority):
```
button → <button>, <input type="submit">, <input type="button">
input → <input type="text">, <input type="email">, <input type="password">
select → <select>
textarea → <textarea>
link → <a>
checkbox → <input type="checkbox">
radio → <input type="radio">
```

**Structural Elements**:
```
navigation → <nav>
header → <header>
footer → <footer>
main → <main>
section → <section>
article → <article>
```

**Content Elements**:
```
heading → <h1>, <h2>, <h3>, <h4>, <h5>, <h6>
paragraph → <p>
image → <img>
video → <video>
list → <ul>, <ol>
listitem → <li>
```

### Phase 4: Enhanced System Instruction Implementation

**Strategy: Two-Phase Detection with Conditional Logic**

The key is to make the LLM first analyze the context, then conditionally apply different naming schemes based on that analysis.

**Updated DETECTION_SYSTEM_INSTRUCTION**:
```typescript
const DETECTION_SYSTEM_INSTRUCTION = `
You are a precise visual detection assistant with context-aware element naming.

STEP 1 - CONTEXT ANALYSIS:
First, analyze this image to determine the interface type:

WEB INTERFACE INDICATORS (look for these):
- Browser elements: address bar, tabs, navigation buttons, bookmarks
- Web UI patterns: navigation menus, breadcrumbs, form layouts
- Web typography: typical web fonts and text rendering
- HTML form controls: standard web input fields, buttons, dropdowns
- Web layout patterns: grid systems, responsive design, web-style spacing
- URL visible, web page content, browser interface

If you detect 2 or more web indicators → WEB CONTEXT = TRUE
If unclear or mobile/desktop app → WEB CONTEXT = FALSE

STEP 2 - CONDITIONAL ELEMENT NAMING:

IF WEB CONTEXT = TRUE:
Use specific HTML element names:
- Buttons: "button", "input[type=\"submit\"]", "input[type=\"button\"]"
- Text inputs: "input[type=\"text\"]", "input[type=\"email\"]", "input[type=\"password\"]"
- Form controls: "select", "textarea", "label", "fieldset"
- Links: "a"
- Navigation: "nav", "ul", "ol", "li"
- Structure: "header", "footer", "main", "section", "article"
- Content: "h1", "h2", "h3", "h4", "h5", "h6", "p", "img", "video"

IF WEB CONTEXT = FALSE:
Use generic element names:
- "button", "input", "text", "image", "icon", "container", "object"

STEP 3 - OUTPUT FORMAT:
For each detected element, return:
{
  "object": "<conditional name based on context analysis>",
  "label": "<descriptive label>",
  "normalized_box_2d": [ymin, xmin, ymax, xmax]
}

STEP 4 - EXAMPLES:

Web Context Example:
{
  "object": "input[type=\"email\"]",
  "label": "Email address field",
  "normalized_box_2d": [180, 200, 220, 600]
}

Non-Web Context Example:
{
  "object": "input",
  "label": "Email address field",
  "normalized_box_2d": [180, 200, 220, 600]
}

Return only valid JSON array - no explanatory text, no context description.
`;
```

## Practical Implementation in Code

### Method 1: Single System Instruction (Recommended)

**File**: `src/tools/detect_objects_in_image.ts`

The LLM handles context detection internally through the enhanced system instruction:

```typescript
// Enhanced system instruction with conditional logic
const DETECTION_SYSTEM_INSTRUCTION = `
You are a precise visual detection assistant with context-aware element naming.

STEP 1 - CONTEXT ANALYSIS:
First, analyze this image to determine the interface type:

WEB INTERFACE INDICATORS (look for these):
- Browser elements: address bar, tabs, navigation buttons, bookmarks
- Web UI patterns: navigation menus, breadcrumbs, form layouts
- Web typography: typical web fonts and text rendering
- HTML form controls: standard web input fields, buttons, dropdowns
- Web layout patterns: grid systems, responsive design, web-style spacing
- URL visible, web page content, browser interface

If you detect 2 or more web indicators → WEB CONTEXT = TRUE
If unclear or mobile/desktop app → WEB CONTEXT = FALSE

STEP 2 - CONDITIONAL ELEMENT NAMING:

IF WEB CONTEXT = TRUE:
Use specific HTML element names:
- Buttons: "button", "input[type=\"submit\"]", "input[type=\"button\"]"
- Text inputs: "input[type=\"text\"]", "input[type=\"email\"]", "input[type=\"password\"]"
- Form controls: "select", "textarea", "label", "fieldset"
- Links: "a"
- Navigation: "nav", "ul", "ol", "li"
- Structure: "header", "footer", "main", "section", "article"
- Content: "h1", "h2", "h3", "h4", "h5", "h6", "p", "img", "video"

IF WEB CONTEXT = FALSE:
Use generic element names:
- "button", "input", "text", "image", "icon", "container", "object"

Return only valid JSON array with conditional naming applied.
`;

// No code changes needed - LLM handles context detection automatically
export async function detect_objects_in_image(
  args: ObjectDetectionArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<ObjectDetectionResponse> {
  // ... existing code ...

  const options: AnalysisOptions = {
    // ... existing options ...
    systemInstruction: DETECTION_SYSTEM_INSTRUCTION, // Enhanced instruction
  };

  // LLM automatically applies conditional naming based on context analysis
  const result = await imageProvider.analyzeImage(
    processedImageSource,
    detectionPrompt,
    options
  );

  // ... rest of existing code unchanged ...
}
```

## Implementation Approach: Single System Instruction

**How it works:**
- Single API call with enhanced system instruction
- LLM internally analyzes context and applies conditional naming
- No code changes to existing flow

**Benefits:**
- ✅ **Simplest Implementation**: No additional API calls or complexity
- ✅ **Cost Efficient**: Single request instead of two
- ✅ **Faster Execution**: No sequential API calls
- ✅ **Atomic Operation**: Context and detection in one step
- ✅ **No Code Refactoring**: Drop-in replacement for existing system instruction

**Implementation Strategy:**
- Start with single instruction approach
- Monitor accuracy through logging and user feedback
- Modern LLMs are capable of following complex conditional instructions reliably

## Example Outputs with Conditional Naming

### Same Screenshot, Different Contexts

**Web Page Screenshot:**
```json
[
  {
    "object": "input[type=\"email\"]",
    "label": "Email address field",
    "normalized_box_2d": [180, 200, 220, 600]
  },
  {
    "object": "button[type=\"submit\"]",
    "label": "Login submit button",
    "normalized_box_2d": [245, 720, 290, 850]
  },
  {
    "object": "nav",
    "label": "Main navigation menu",
    "normalized_box_2d": [50, 100, 120, 900]
  }
]
```

**Mobile App Screenshot (Same Visual Elements):**
```json
[
  {
    "object": "input",
    "label": "Email address field",
    "normalized_box_2d": [180, 200, 220, 600]
  },
  {
    "object": "button",
    "label": "Login submit button",
    "normalized_box_2d": [245, 720, 290, 850]
  },
  {
    "object": "container",
    "label": "Main navigation menu",
    "normalized_box_2d": [50, 100, 120, 900]
  }
]
```

**Key Difference:** Same visual elements get HTML-specific names for web contexts, generic names for non-web contexts.

## CSS Selector Integration

**Enhanced Summary Generation**:
```typescript
function suggestCSSSelectors(detection: DetectedObject): string[] {
  const selectors = [];

  // HTML element-specific selectors
  if (detection.object.startsWith('input[type=')) {
    const inputType = detection.object.match(/type="([^"]+)"/)?.[1];
    selectors.push(`input[type="${inputType}"]`);
    selectors.push(`input[name="${detection.label.toLowerCase().replace(/\s+/g, '_')}"]`);
  } else if (detection.object === 'button') {
    selectors.push('button[type="submit"]');
    selectors.push(`button:has-text("${detection.label}")`);
  } else if (detection.object === 'select') {
    selectors.push('select');
    selectors.push(`select[name="${detection.label.toLowerCase().replace(/\s+/g, '_')}"]`);
  }

  return selectors;
}
```

## Benefits

- **Perfect CSS Alignment**: HTML element names directly map to selectors
- **Automation Accuracy**: More precise element targeting for web automation
- **Context Awareness**: Appropriate naming based on interface type
- **Backward Compatibility**: Non-web contexts unchanged
- **Framework Integration**: Better integration with Playwright, Puppeteer, Cypress
- **Accessibility Support**: HTML semantics align with accessibility standards
- **Developer Experience**: More intuitive element identification

## Risk Assessment

**Low Risk:**
- **Fallback Mechanism**: Non-web contexts remain unchanged
- **Gradual Implementation**: Can be deployed incrementally
- **No Breaking Changes**: Existing functionality preserved

**Medium Risk:**
- **Detection Accuracy**: Web context detection may have false positives/negatives
- **HTML Specificity**: Need to ensure HTML element names are accurate

**Mitigation Strategies:**
- **Conservative Detection**: Err on side of generic naming when uncertain
- **Validation Testing**: Extensive testing across web and non-web contexts
- **User Feedback**: Monitor accuracy and adjust detection logic

## Success Metrics

1. **Web Detection Accuracy**: >90% correct web vs non-web classification
2. **HTML Element Accuracy**: >85% appropriate HTML element names for web contexts
3. **CSS Selector Utility**: Functional CSS selectors for detected web elements
4. **User Adoption**: Increased usage for web automation scenarios

## Implementation Timeline

- **Day 1**: Update system instructions with web context detection
- **Day 2**: Add HTML element classification logic
- **Day 3**: Integrate with CSS selector generation
- **Day 4**: Testing and validation across different interface types
- **Day 5**: Documentation and deployment

## Future Enhancements

- **Machine Learning**: Train models to better detect web contexts
- **Framework-Specific**: Tailored outputs for different automation frameworks
- **Accessibility**: Include ARIA attributes and accessibility information
- **Mobile Web**: Detect mobile web interfaces vs native mobile apps
- **Component Libraries**: Recognize common UI component patterns

## Conclusion

This enhancement will significantly improve the tool's value for web automation by providing context-aware element classification. The progressive approach ensures backward compatibility while adding substantial value for web-based use cases, making the tool more aligned with modern web development and automation practices.