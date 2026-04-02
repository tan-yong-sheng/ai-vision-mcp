# Extract Layout Tree: 5+ Approach Testing

Testing different strategies to extract semantic layout structure from screenshots.

## Test Image
- File: `01-model-selector-open.png`
- Size: 1036×558 pixels

## Approaches to Test

### Approach 1: Flat List with Parent IDs (Simpler JSON)
**Hypothesis:** Asking for flat list with parent references is easier for Gemini than nested hierarchy.

**Schema:**
```json
{
  "elements": [
    {
      "id": "elem-1",
      "type": "nav",
      "text": "Navigation",
      "parentId": null,
      "bounds": {"x": 0, "y": 0, "width": 1036, "height": 100},
      "role": "navigation",
      "ariaLabel": "Main navigation"
    }
  ]
}
```

**Pros:** Simpler for LLM, easier to validate, flat structure
**Cons:** Loses hierarchy information (but can rebuild in code)

---

### Approach 2: ASCII Tree Format
**Hypothesis:** ASCII tree is easier for Gemini to output than JSON.

**Format:**
```
ROOT (document)
├── NAV (navigation) "GrowChat navigation"
│   ├── A (link) "New Chat"
│   └── INPUT (search) "Search models"
├── DIV (dropdown) "Model selection"
│   ├── DIV (card) "Help me write"
│   └── DIV (card) "Analyze code"
└── MAIN (section) "Content area"
```

**Pros:** Natural for LLM, easier to parse with regex
**Cons:** Harder to extract coordinates, less structured

---

### Approach 3: Multi-Step Extraction
**Hypothesis:** Breaking into steps (hierarchy → text → roles) reduces complexity per step.

**Step 1:** Extract hierarchy only (minimal JSON)
**Step 2:** Extract text content for each element
**Step 3:** Extract ARIA roles and accessibility info

**Pros:** Each step is simpler, can retry individual steps
**Cons:** Multiple API calls, more complex orchestration

---

### Approach 4: Gemini Structured Output (Simpler Schema)
**Hypothesis:** Using Gemini's structured output with minimal required fields works better.

**Schema:**
```json
{
  "root": {
    "type": "document",
    "children": [
      {
        "type": "nav",
        "text": "Navigation",
        "children": []
      }
    ]
  }
}
```

**Pros:** Gemini's structured output enforces schema, fewer optional fields
**Cons:** Still requires nested JSON

---

### Approach 5: Hybrid - Detect Objects + Semantic Enrichment
**Hypothesis:** Use detect_objects_in_image results + single Gemini call for semantic enrichment.

**Process:**
1. Call detect_objects_in_image (already works, returns 38 elements)
2. Build hierarchy from bounding box containment (code-based)
3. Single Gemini call to add text, roles, and semantic info

**Pros:** Reuses working tool, reduces LLM complexity
**Cons:** Requires code-based hierarchy building

---

### Approach 6: Accessibility Tree Format
**Hypothesis:** Accessibility tree format (simpler than DOM tree) is easier for Gemini.

**Format:**
```json
{
  "root": {
    "role": "document",
    "name": "GrowChat",
    "children": [
      {
        "role": "navigation",
        "name": "Main navigation",
        "children": [
          {
            "role": "button",
            "name": "New Chat"
          }
        ]
      }
    ]
  }
}
```

**Pros:** Simpler than full DOM, focuses on semantic structure
**Cons:** Still requires nested JSON

---

## Testing Results

### Approach 1: Flat List with Parent IDs
**Status:** Testing...

### Approach 2: ASCII Tree Format
**Status:** Testing...

### Approach 3: Multi-Step Extraction
**Status:** Testing...

### Approach 4: Gemini Structured Output
**Status:** Testing...

### Approach 5: Hybrid - Detect Objects + Enrichment
**Status:** Testing...

### Approach 6: Accessibility Tree Format
**Status:** Testing...

---

## Recommendation
(To be determined after testing)
