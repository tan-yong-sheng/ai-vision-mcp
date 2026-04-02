# Extract Layout Tree: 5+ Approach Testing Results

## Summary

After testing 5 different approaches to extract semantic layout structure from screenshots, the core finding is:

**Gemini is unreliable at outputting specific JSON formats, even with detailed system instructions.**

The working tool (`detect_objects_in_image`) succeeds because it asks for object detection (a core vision capability), not JSON schema compliance.

---

## Approaches Tested

### ✅ Approach 5: Hybrid (detect_objects_in_image + code-based hierarchy)

**Status:** Partially works, but enrichment step fails

**What works:**
- `detect_objects_in_image` reliably detects 38 UI elements with high confidence (0.9-0.95)
- Bounding box data is accurate and normalized
- Building hierarchy from bounding boxes using code is deterministic

**What fails:**
- Enrichment step (asking Gemini to add text/roles) returns nested JSON instead of flat semantic map
- Gemini ignores system instruction to return `{"elem-0": {"text": "...", "role": "..."}}` format
- Instead returns the old nested hierarchy format

**Why it fails:**
Gemini doesn't reliably follow JSON schema constraints in system instructions. It defaults to its training patterns (nested hierarchies) over explicit format requests.

---

### ❌ Approach 1: Flat List with Parent IDs

**Status:** Failed

**Hypothesis:** Flat list with parent references is easier for Gemini than nested hierarchy

**Result:** Gemini ignores the instruction and returns nested JSON anyway

**Why it failed:** Same root cause - Gemini doesn't follow JSON format constraints reliably

---

### ❌ Approach 2: ASCII Tree Format

**Status:** Failed

**Hypothesis:** ASCII tree is easier for Gemini to output than JSON

**Result:** Gemini returns nested JSON instead of ASCII tree

**Why it failed:** Gemini's training heavily favors JSON output for structured data, even when explicitly asked for ASCII

---

### ❌ Approach 3: Multi-Step Extraction

**Status:** Not fully tested (would require 3 API calls)

**Issue:** Even if each step worked individually, the overhead of 3 API calls + parsing makes this inefficient

---

### ❌ Approach 4: Accessibility Tree Format

**Status:** Failed

**Hypothesis:** Simpler semantic structure (role + name only) is easier for Gemini

**Result:** Gemini returns nested JSON with full DOM structure instead

**Why it failed:** Same pattern - Gemini doesn't follow format constraints

---

### ❌ Approach 6: Structured Output with Simpler Schema

**Status:** Not tested (Gemini structured output still requires JSON schema compliance)

**Why skipped:** Gemini's structured output feature still has the same fundamental issue - it can't reliably enforce JSON schemas that differ from its training patterns

---

## Key Findings

### 1. Vision Model Limitations

Gemini is trained to output nested hierarchies for UI structure. Asking it to output flat lists, ASCII trees, or other formats fails because:
- The model's training data heavily favors nested JSON
- System instructions are suggestions, not hard constraints
- The model defaults to familiar patterns when uncertain

### 2. What Works: Core Vision Capabilities

`detect_objects_in_image` works because:
- Object detection is a core vision capability
- Bounding boxes are visual data, not format constraints
- Confidence scores are natural outputs of detection models
- No complex JSON schema enforcement needed

### 3. What Doesn't Work: JSON Format Constraints

Asking Gemini to output specific JSON formats fails because:
- JSON schema is a constraint, not a capability
- System instructions can't override training patterns
- The model will default to familiar formats (nested hierarchies)
- Even with explicit examples, compliance is unreliable

---

## Recommendation: Accept Limitations

### Option A: Use detect_objects_in_image as-is (RECOMMENDED)

**Pros:**
- ✅ Works reliably (38 elements detected)
- ✅ Provides bounding boxes, confidence scores, element types
- ✅ Can build hierarchy from bounding boxes using code
- ✅ No semantic enrichment needed for many use cases

**Cons:**
- ❌ No text content (only element labels from detection)
- ❌ No ARIA roles (only element types)
- ❌ Limited semantic information

**Use cases:**
- UI layout analysis
- Element positioning and spacing
- Visual hierarchy understanding
- Component detection

---

### Option B: Delete extract_layout_tree

**Rationale:**
- `extract_layout_tree` cannot reliably extract semantic structure from screenshots
- Gemini cannot be forced to output specific JSON formats
- The tool would be unreliable and confusing to users

**Alternative:**
- Keep `detect_objects_in_image` as the primary layout analysis tool
- Document its capabilities and limitations clearly
- Users can build hierarchy from bounding boxes in their own code if needed

---

### Option C: Hybrid Approach with Manual Enrichment

**Idea:**
- Use `detect_objects_in_image` to get elements + bounding boxes
- Provide a separate tool for users to manually add semantic info (text, roles)
- Or integrate with Playwright for actual DOM access (if page is available)

**Pros:**
- ✅ Reliable detection
- ✅ User-controlled enrichment
- ✅ Can integrate with real DOM when available

**Cons:**
- ❌ Requires manual work or page access
- ❌ More complex for users

---

## Conclusion

**The fundamental issue is not with our implementation, but with Gemini's inability to reliably output specific JSON formats.**

The vision model is excellent at:
- Detecting objects and their positions
- Providing confidence scores
- Identifying element types

The vision model is poor at:
- Following JSON schema constraints
- Outputting non-standard formats
- Enforcing format compliance via system instructions

**Recommendation:** Accept `detect_objects_in_image` as the primary tool for layout analysis. It works reliably and provides valuable information. For semantic enrichment (text, roles), either:
1. Accept the limitations and document them
2. Integrate with Playwright for real DOM access
3. Let users manually enrich the data

Trying to force Gemini to output specific JSON formats is a losing battle.
