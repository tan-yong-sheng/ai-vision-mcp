# Design Eval Plugin - Testing and Verification Guide

## Pre-Launch Checklist

### Plugin Structure Verification

- [x] `.claude-plugin/plugin.json` - Plugin manifest created
- [x] `README.md` - User documentation created
- [x] `commands/` directory with 5 command specs:
  - [x] `audit-design.md` - Full design audit
  - [x] `audit-accessibility.md` - WCAG compliance
  - [x] `audit-visual-consistency.md` - Design tokens
  - [x] `audit-components.md` - Component reusability
  - [x] `audit-design-debt.md` - Design system maturity
- [x] `agents/` directory with 4 agent specs:
  - [x] `design-auditor.md` - Orchestrator
  - [x] `accessibility-tester.md` - Accessibility expert
  - [x] `visual-consistency-tester.md` - Visual regression expert
  - [x] `design-system-maturity-tester.md` - Governance specialist
- [x] `skills/` directory with 3 skill domains:
  - [x] `design-audit-framework/` (SKILL.md + 4 references)
  - [x] `visual-consistency-validation/` (SKILL.md + 2 references)
  - [x] `design-system-governance/` (SKILL.md + 2 references)
- [x] `.gitignore` - Ignore patterns configured

### Command Specifications Validation

Each command file should have:
- [x] YAML frontmatter with `description`, `context`, `allowed-tools`, `argument-hint`
- [x] Standardized argument format: `--imageSource <source> [optional-params]`
- [x] Execution instructions routing to correct subagent
- [x] No duplicate parameters in argument-hint

**Commands verified:**
- [x] `/design-eval:audit-design` - Full audit (routes to design-auditor)
- [x] `/design-eval:audit-accessibility` - WCAG compliance (routes to accessibility-tester)
- [x] `/design-eval:audit-visual-consistency` - Design tokens (routes to visual-consistency-tester)
- [x] `/design-eval:audit-components` - Component analysis (routes to design-system-maturity-tester)
- [x] `/design-eval:audit-design-debt` - Design debt (routes to design-system-maturity-tester)

### Agent Specifications Validation

Each agent file should have:
- [x] YAML frontmatter with `name`, `description`, `tools`, `model`
- [x] Rich specialist introduction (2-3 sentences)
- [x] Scope section describing analysis dimensions
- [x] Execution flow section
- [x] LLM Prompt Template(s) with XML structure
- [x] Reference to relevant skills
- [x] Integration explanation
- [x] Complete JSON output example

**Agents verified:**
- [x] `design-auditor` - Orchestrates 3 subagents in parallel
- [x] `accessibility-tester` - WCAG 2.1/3.0 compliance analysis
- [x] `visual-consistency-tester` - Design token validation and regression detection
- [x] `design-system-maturity-tester` - Governance and maturity assessment

### Skills Validation

Each skill domain should have:
- [x] `SKILL.md` with guidance and frameworks
- [x] Reference materials in `references/` subdirectory
- [x] Clear "When to Use" section
- [x] Actionable guidance and patterns
- [x] Red flags and anti-patterns

**Skills verified:**
- [x] `design-audit-framework/` - Nielsen heuristics, WCAG, maturity models
- [x] `visual-consistency-validation/` - Token mapping, violation detection, severity categorization
- [x] `design-system-governance/` - Governance processes, maturity assessment

## End-to-End Testing

### Test 1: Command Invocation and Routing

**Objective:** Verify each command routes to correct agent with proper argument parsing

**Test cases:**

```bash
# Test audit-design routing
/design-eval:audit-design --imageSource https://example.com/screenshot.png --userPrompt "check accessibility" --depth deep

# Test audit-accessibility routing
/design-eval:audit-accessibility --imageSource ./form.png --userPrompt "WCAG compliance" --level AA --wcag-version 3.0

# Test audit-visual-consistency routing
/design-eval:audit-visual-consistency --imageSource ./component.png --userPrompt "validate tokens" --design-system ./tokens.json

# Test audit-components routing
/design-eval:audit-components --imageSource ./src/components --userPrompt "find duplicates" --scope src/components

# Test audit-design-debt routing
/design-eval:audit-design-debt --imageSource ./screenshots --userPrompt "assess maturity" --threshold 30
```

**Expected behavior:**
1. Command is recognized by Claude Code
2. Arguments are parsed correctly (required: `--imageSource`, `--userPrompt`)
3. Optional parameters are recognized
4. Request routes to correct subagent
5. Subagent receives all parameters

**Verification checklist:**
- [ ] All 5 commands appear in plugin marketplace
- [ ] Command help text displays correctly
- [ ] Arguments parse without errors
- [ ] Subagents receive correct parameters
- [ ] No duplicate parameter warnings

### Test 2: Agent Orchestration (design-auditor)

**Objective:** Verify design-auditor spawns 3 subagents in parallel and aggregates results

**Test case:**
```bash
/design-eval:audit-design --imageSource https://example.com --userPrompt "comprehensive audit" --depth standard
```

**Expected behavior:**
1. design-auditor receives request
2. Spawns 3 subagents in parallel:
   - accessibility-tester for WCAG compliance
   - visual-consistency-tester for design tokens
   - design-system-maturity-tester for governance
3. Waits for all subagents to complete
4. Aggregates results into unified report
5. Deduplicates findings across dimensions
6. Prioritizes by severity and impact

**Verification checklist:**
- [ ] All 3 subagents are invoked
- [ ] Subagents run in parallel (not sequentially)
- [ ] Results are aggregated correctly
- [ ] No data loss during aggregation
- [ ] Findings are deduplicated
- [ ] Output includes all 4 dimensions (heuristics, accessibility, visual, governance)

### Test 3: Skill Accessibility

**Objective:** Verify skills are discoverable and referenced correctly

**Test cases:**
- Access design-audit-framework skill during audit
- Access visual-consistency-validation skill during visual audit
- Access design-system-governance skill during maturity assessment

**Expected behavior:**
1. Skills are discoverable in plugin
2. Reference materials are linked correctly
3. Guidance is clear and actionable
4. Code examples are syntactically correct
5. Cross-references between skills work

**Verification checklist:**
- [ ] Skills appear in plugin skill list
- [ ] Reference files are accessible
- [ ] Links between files work
- [ ] Code examples are correct
- [ ] No broken references

### Test 4: Output Schema Validation

**Objective:** Verify output matches expected JSON structure for each command

**Test case 1: audit-design output**
```json
{
  "summary": {
    "totalFindings": number,
    "bySeverity": {
      "critical": number,
      "high": number,
      "medium": number,
      "low": number,
      "info": number
    },
    "overallAssessment": "string"
  },
  "findings": {
    "heuristics": [...],
    "accessibility": [...],
    "visualConsistency": [...],
    "componentAnalysis": [...]
  },
  "recommendations": [...]
}
```

**Test case 2: audit-accessibility output**
```json
{
  "summary": {
    "totalFindings": number,
    "wcagLevel": "A|AA|AAA",
    "wcagVersion": "2.1|3.0",
    "complianceStatus": "compliant|partial|non-compliant"
  },
  "findings": [
    {
      "id": "string",
      "title": "string",
      "severity": "critical|high|medium|low|info",
      "criterion": "WCAG criterion",
      "description": "string",
      "affectedElements": ["string"],
      "remediation": {
        "cssCode": "string",
        "effort": "low|medium|high"
      },
      "testingApproach": "string"
    }
  ]
}
```

**Test case 3: audit-visual-consistency output**
```json
{
  "summary": {
    "totalFindings": number,
    "consistencyScore": number,
    "breakpointsAnalyzed": ["string"],
    "statesAnalyzed": ["string"]
  },
  "findings": [
    {
      "title": "string",
      "severity": "critical|high|medium|low",
      "tokenName": "string",
      "expectedValue": "string",
      "actualValue": "string",
      "affectedElements": ["string"],
      "remediation": {
        "cssCode": "string",
        "effort": "low|medium|high"
      }
    }
  ],
  "regressions": []
}
```

**Test case 4: audit-design-debt output**
```json
{
  "summary": {
    "maturityLevel": 1|2|3|4,
    "maturityLevelDescription": "string",
    "adoptionRate": number,
    "customComponentRatio": number,
    "debtScore": number
  },
  "maturityAssessment": {
    "level": number,
    "justification": "string",
    "characteristics": ["string"]
  },
  "adoptionMetrics": {
    "byTeam": [...],
    "trend": "improving|stable|declining"
  },
  "recommendations": [...]
}
```

**Verification checklist:**
- [ ] Output is valid JSON
- [ ] All required fields present
- [ ] Field types match schema
- [ ] Findings are properly categorized
- [ ] Summary metrics are accurate
- [ ] No extra/unexpected fields

### Test 5: Argument Validation

**Objective:** Verify argument parsing and validation

**Test cases:**

```bash
# Missing required --imageSource
/design-eval:audit-design --userPrompt "test"
# Expected: Error - missing required argument

# Missing required --userPrompt
/design-eval:audit-design --imageSource ./test.png
# Expected: Error - missing required argument

# Invalid --depth value
/design-eval:audit-design --imageSource ./test.png --userPrompt "test" --depth invalid
# Expected: Error - invalid depth value

# Invalid --level value
/design-eval:audit-accessibility --imageSource ./test.png --userPrompt "test" --level X
# Expected: Error - invalid level value

# Valid optional parameters
/design-eval:audit-design --imageSource ./test.png --userPrompt "test" --depth quick
# Expected: Success - parameters accepted

# Visual consistency: token-compliance mode without --imageSource
/design-eval:audit-visual-consistency --mode token-compliance --baseline ./baseline.png --current ./current.png
# Expected: Error - --baseline and --current not allowed in token-compliance mode

# Visual consistency: regression mode without --baseline and --current
/design-eval:audit-visual-consistency --mode regression --imageSource ./component.png
# Expected: Error - --imageSource not allowed in regression mode

# Visual consistency: regression mode missing --current
/design-eval:audit-visual-consistency --mode regression --baseline ./baseline.png
# Expected: Error - --current is required for regression mode

# Visual consistency: invalid mode value
/design-eval:audit-visual-consistency --mode invalid --imageSource ./component.png
# Expected: Error - invalid mode value

# Visual consistency: valid token-compliance mode
/design-eval:audit-visual-consistency --mode token-compliance --imageSource ./component.png
# Expected: Success - parameters accepted

# Visual consistency: valid regression mode
/design-eval:audit-visual-consistency --mode regression --baseline ./baseline.png --current ./current.png
# Expected: Success - parameters accepted
```

**Verification checklist:**
- [ ] Required parameters are enforced
- [ ] Optional parameters are validated
- [ ] Mode-specific argument validation works correctly
- [ ] Invalid values are rejected with clear errors
- [ ] Valid combinations are accepted

## Manual Testing Scenarios

### Scenario 1: Quick Design Audit

**Command:**
```bash
/design-eval:audit-design --imageSource https://example.com --userPrompt "quick overview" --depth quick
```

**Expected:**
- Fast execution (1-2 minutes)
- Overview-level findings (5-10 items)
- All 4 dimensions represented
- Actionable recommendations
- Clear severity distribution

**Verification:**
- [ ] Execution completes within expected time
- [ ] Findings are concise and relevant
- [ ] Recommendations are prioritized
- [ ] Output is well-formatted JSON

### Scenario 2: Deep Accessibility Check

**Command:**
```bash
/design-eval:audit-accessibility --imageSource https://example.com/form --userPrompt "comprehensive WCAG check" --level AA --wcag-version 3.0
```

**Expected:**
- Comprehensive accessibility analysis
- WCAG 3.0 outcome-focused assessment
- Specific remediation code examples
- Testing steps for verification
- Assistive technology considerations

**Verification:**
- [ ] WCAG 3.0 criteria are applied
- [ ] Remediation code is correct
- [ ] Testing approach is clear
- [ ] Output includes all affected elements

### Test 3: Visual Consistency Validation

**Command:**
```bash
/design-eval:audit-visual-consistency --mode token-compliance --imageSource ./component.png --userPrompt "validate design tokens" --design-system ./design-tokens.json
```

**Expected:**
- Token compliance analysis
- Violation detection with severity
- Responsive design validation
- State coverage analysis (light, dark, high-contrast)
- Design system alignment check

**Verification:**
- [ ] All tokens are analyzed
- [ ] Violations are quantified
- [ ] Severity is appropriate
- [ ] Remediation is provided

### Test 4: Visual Regression Detection

**Command:**
```bash
/design-eval:audit-visual-consistency --mode regression --baseline ./baseline.png --current ./current.png --userPrompt "check for layout shifts"
```

**Expected:**
- Baseline vs current comparison
- Change detection (layout, color, typography, spacing)
- Severity assessment (critical, high, medium, low)
- Regression identification
- Design system alignment (if DESIGN.md provided)

**Verification:**
- [ ] All changes are detected
- [ ] Severity is justified
- [ ] Remediation is provided
- [ ] Design system alignment is checked

### Scenario 4: Component Reusability Analysis

**Command:**
```bash
/design-eval:audit-components --imageSource ./src/components --userPrompt "identify duplicate patterns" --scope src/components
```

**Expected:**
- Component inventory
- Duplication detection
- Consolidation opportunities
- API consistency analysis
- Naming convention compliance

**Verification:**
- [ ] All components are analyzed
- [ ] Duplicates are identified
- [ ] Consolidation recommendations are clear
- [ ] Effort estimation is provided

### Scenario 5: Design System Maturity Assessment

**Command:**
```bash
/design-eval:audit-design-debt --imageSource ./screenshots --userPrompt "assess governance health" --threshold 30
```

**Expected:**
- Maturity level assessment (1-4)
- Adoption metrics by team
- Design debt drivers identified
- Governance health evaluation
- Transition roadmap to next level

**Verification:**
- [ ] Maturity level is justified
- [ ] Adoption metrics are accurate
- [ ] Debt drivers are specific
- [ ] Roadmap is actionable

## Troubleshooting Guide

### Issue: Command Not Found

**Symptom:** `/design-eval:audit-design` not recognized

**Diagnosis:**
1. Verify plugin is installed: `/plugin list`
2. Check plugin.json is valid JSON
3. Verify command names match exactly

**Solution:**
- Reinstall plugin: `/plugin install ./plugins/design-eval`
- Validate plugin.json syntax: `jq . .claude-plugin/plugin.json`
- Check for typos in command names

### Issue: Subagent Not Responding

**Symptom:** Timeout waiting for subagent

**Diagnosis:**
1. Subagent crashed or errored
2. Network issue
3. Resource exhaustion
4. Gemini API rate limiting

**Solution:**
- Check subagent logs for errors
- Verify network connectivity
- Reduce scope/complexity of request
- Wait and retry with backoff

### Issue: Invalid JSON Output

**Symptom:** "JSON parse error"

**Diagnosis:**
1. Gemini response is not valid JSON
2. Response contains extra text before/after JSON
3. Encoding issues
4. Incomplete response

**Solution:**
- Verify Gemini CLI output format
- Check response parsing logic
- Verify encoding is UTF-8
- Check for timeout/truncation

### Issue: Missing Required Arguments

**Symptom:** "Missing required argument: --imageSource"

**Diagnosis:**
1. Required argument not provided
2. Argument name misspelled
3. Argument value is empty

**Solution:**
- Provide both `--imageSource` and `--userPrompt`
- Check argument spelling matches exactly
- Verify argument values are not empty

### Issue: Invalid Argument Value

**Symptom:** "Invalid value for --depth: invalid"

**Diagnosis:**
1. Optional parameter value not in allowed list
2. Typo in parameter value

**Solution:**
- Use valid values: `quick`, `standard`, `deep` for `--depth`
- Use valid values: `A`, `AA`, `AAA` for `--level`
- Use valid values: `2.1`, `3.0` for `--wcag-version`

## Performance Benchmarks

### Expected Execution Times

| Command | Depth/Scope | Expected Time |
|---------|------------|----------------|
| audit-design | quick | 1-2 minutes |
| audit-design | standard | 3-5 minutes |
| audit-design | deep | 5-10 minutes |
| audit-accessibility | AA | 2-4 minutes |
| audit-visual-consistency | - | 2-3 minutes |
| audit-components | - | 3-5 minutes |
| audit-design-debt | - | 2-3 minutes |

### Resource Requirements

- **Memory:** 512MB minimum (1GB recommended)
- **Network:** Stable internet connection for Gemini API
- **Disk:** 100MB for screenshots and artifacts
- **CPU:** 2+ cores recommended

## Release Checklist

Before releasing to production:

- [x] All command specs are standardized
- [x] All agent specs follow consistent format
- [x] All skills have proper structure
- [x] README.md is complete and accurate
- [x] TESTING.md is complete and accurate
- [x] Plugin manifest is valid
- [ ] All commands tested end-to-end
- [ ] All agents tested with parallel execution
- [ ] All skills are accessible and linked
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Security review completed
- [ ] No hardcoded secrets or credentials
- [ ] Version number is updated
- [ ] Changelog is updated
- [ ] Plugin is tagged in git

## Post-Launch Monitoring

### Metrics to Track

- Command invocation frequency
- Average execution time per command
- Error rate and error types
- Subagent success rate
- User satisfaction (if feedback available)
- Gemini API usage and costs

### Support Plan

- Monitor for error reports
- Respond to user feedback
- Update documentation based on questions
- Plan improvements based on usage patterns
- Schedule regular maintenance updates

## Future Enhancements

Potential improvements for future versions:

1. **Caching** - Cache baseline screenshots for faster regression detection
2. **Batch Processing** - Audit multiple URLs in one command
3. **Custom Rules** - Allow users to define custom audit rules
4. **Integration** - Connect to design system APIs for real-time validation
5. **Reporting** - Generate PDF/HTML reports for stakeholders
6. **Scheduling** - Schedule regular audits and email reports
7. **Collaboration** - Share findings and comments with team
8. **Automation** - CI/CD integration for automated design audits
9. **Baseline Management** - Store and compare against historical baselines
10. **Team Analytics** - Track design system adoption trends over time
