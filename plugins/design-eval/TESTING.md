# Design Eval Plugin - Testing and Verification Guide

## Pre-Launch Checklist

### Plugin Structure Verification

- [x] `.claude-plugin/plugin.json` - Plugin manifest created
- [x] `README.md` - User documentation created
- [x] `commands/` directory with 5 command specs:
  - [x] `audit-design.md`
  - [x] `accessibility-check.md`
  - [x] `visual-consistency.md`
  - [x] `component-audit.md`
  - [x] `design-debt-report.md`
- [x] `agents/` directory with 4 agent specs:
  - [x] `design-auditor.md`
  - [x] `accessibility-tester.md`
  - [x] `design-system-maturity-tester.md`
  - [x] `visual-consistency-tester.md`
- [x] `skills/` directory with 3 skill domains:
  - [x] `design-audit-framework/` (SKILL.md + 4 references)
  - [x] `visual-testing/` (SKILL.md + 2 references)
  - [x] `design-system-governance/` (SKILL.md + 2 references)
- [x] `.gitignore` - Ignore patterns configured

### Plugin Manifest Validation

**File:** `.claude-plugin/plugin.json`

Verify:
- [x] Plugin name: "design-eval"
- [x] Display name: "Design Evaluation Suite"
- [x] Version: "1.0.0"
- [x] 5 commands defined with correct names
- [x] 4 agents defined with correct names
- [x] 3 skills defined with correct names
- [x] All required fields present (name, displayName, description, author, keywords, license)

### Command Specifications Validation

Each command file should have:
- [x] YAML frontmatter with description, allowed-tools, argument-hint
- [x] Usage examples with correct syntax
- [x] Arguments table with descriptions
- [x] Execution instructions
- [x] Output format (JSON schema)

**Commands verified:**
- [x] `/design-eval:audit-design` - Full audit command
- [x] `/design-eval:accessibility-check` - WCAG compliance command
- [x] `/design-eval:visual-consistency` - Design tokens command
- [x] `/design-eval:component-audit` - Component analysis command
- [x] `/design-eval:design-debt-report` - Design debt command

### Agent Specifications Validation

Each agent file should have:
- [x] YAML frontmatter with name, description, tools, model
- [x] Responsibilities section
- [x] Execution flow section
- [x] Gemini prompt template(s)
- [x] Reference to relevant skills

**Agents verified:**
- [x] `design-auditor` - Orchestrator agent
- [x] `accessibility-tester` - Accessibility expert
- [x] `design-system-maturity-tester` - Governance specialist
- [x] `visual-consistency-tester` - Visual regression expert

### Skills Validation

Each skill domain should have:
- [x] `SKILL.md` with guidance and frameworks
- [x] Reference materials in `references/` subdirectory
- [x] Clear "When to Use" section
- [x] Actionable guidance and patterns

**Skills verified:**
- [x] `design-audit-framework/` - Nielsen heuristics, WCAG, maturity models
- [x] `visual-testing/` - Playwright patterns, regression testing
- [x] `design-system-governance/` - Governance processes, maturity assessment

## End-to-End Testing

### Test 1: Command Invocation

**Objective:** Verify command routes to correct agent

**Test case:**
```bash
/design-eval:audit-design --url https://example.com --depth deep
```

**Expected behavior:**
1. Command is recognized by Claude Code
2. Arguments are parsed correctly
3. Request is routed to `design-eval:design-auditor` agent
4. Agent receives correct parameters

**Verification:**
- [ ] Command appears in plugin marketplace
- [ ] Command help text displays correctly
- [ ] Arguments are parsed without errors
- [ ] Agent receives correct parameters

### Test 2: Agent Orchestration

**Objective:** Verify design-auditor spawns subagents in parallel

**Test case:**
```bash
/design-eval:audit-design --url https://example.com --depth standard
```

**Expected behavior:**
1. Design-auditor agent receives request
2. Spawns 3 subagents in parallel:
   - accessibility-tester for accessibility analysis
   - visual-consistency-tester for visual consistency
   - design-system-maturity-tester for governance
3. Waits for all subagents to complete
4. Aggregates results into unified report

**Verification:**
- [ ] All 3 subagents are invoked
- [ ] Subagents run in parallel (not sequentially)
- [ ] Results are aggregated correctly
- [ ] No data loss during aggregation

### Test 3: Gemini CLI Integration

**Objective:** Verify Gemini CLI is invoked correctly

**Prerequisites:**
- Gemini CLI installed: `npm install -g @google/gemini-cli`
- Authenticated: `gemini auth`

**Test case:**
```bash
/design-eval:audit-design --url https://example.com --depth quick
```

**Expected behavior:**
1. Agent constructs Gemini prompt
2. Invokes Gemini CLI with correct arguments
3. Receives JSON response from Gemini
4. Parses response without errors

**Verification:**
- [ ] Gemini CLI is invoked
- [ ] Prompt is well-formed XML/markdown
- [ ] Response is valid JSON
- [ ] No parsing errors

### Test 4: Output Schema Validation

**Objective:** Verify output matches expected JSON schema

**Test case:**
```bash
/design-eval:audit-design --url https://example.com --depth standard
```

**Expected output structure:**
```json
{
  "audit_type": "full_design_audit",
  "depth": "standard",
  "url": "https://example.com",
  "timestamp": "ISO-8601 timestamp",
  "findings": {
    "heuristics": [...],
    "accessibility": [...],
    "visual_consistency": [...],
    "component_analysis": [...]
  },
  "summary": {
    "total_findings": number,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number,
    "info": number,
    "overall_assessment": "string"
  }
}
```

**Verification:**
- [ ] Output is valid JSON
- [ ] All required fields present
- [ ] Field types match schema
- [ ] Findings are properly categorized
- [ ] Summary metrics are accurate

### Test 5: Skill References

**Objective:** Verify skills are accessible and linked correctly

**Test case:**
Access design-audit-framework skill during audit

**Expected behavior:**
1. Skill is discoverable in plugin
2. Reference materials are linked
3. Guidance is clear and actionable
4. Code examples are correct

**Verification:**
- [ ] Skills appear in plugin skill list
- [ ] Reference files are accessible
- [ ] Links between files work
- [ ] Code examples are syntactically correct

## Manual Testing Scenarios

### Scenario 1: Quick Design Audit

**Command:**
```bash
/design-eval:audit-design --url https://example.com --depth quick
```

**Expected:**
- Fast execution (<2 minutes)
- Overview-level findings
- 5-10 findings identified
- Actionable recommendations

### Scenario 2: Deep Accessibility Check

**Command:**
```bash
/design-eval:accessibility-check --url https://example.com --level AA --wcag-version 3.0
```

**Expected:**
- Comprehensive accessibility analysis
- WCAG 3.0 outcome-focused assessment
- Specific remediation code examples
- Testing steps for verification

### Scenario 3: Design System Maturity Assessment

**Command:**
```bash
/design-eval:design-debt-report --url https://example.com --threshold 30
```

**Expected:**
- Adoption metrics calculated
- Maturity level assessed (1-4)
- Governance health evaluated
- Trend analysis provided

## Troubleshooting Guide

### Issue: Command Not Found

**Symptom:** `/design-eval:audit-design` not recognized

**Diagnosis:**
1. Verify plugin is installed: `/plugin list`
2. Check plugin.json is valid JSON
3. Verify command names match exactly

**Solution:**
- Reinstall plugin: `/plugin install ./plugins/design-eval`
- Validate plugin.json syntax
- Check for typos in command names

### Issue: Gemini CLI Not Found

**Symptom:** "gemini: command not found"

**Diagnosis:**
1. Gemini CLI not installed
2. Not in PATH

**Solution:**
```bash
npm install -g @google/gemini-cli
gemini auth
```

### Issue: Invalid JSON Output

**Symptom:** "JSON parse error"

**Diagnosis:**
1. Gemini response is not valid JSON
2. Response contains extra text before/after JSON
3. Encoding issues

**Solution:**
- Check Gemini CLI output format: `--output-format json`
- Verify response parsing logic
- Check for encoding issues

### Issue: Subagent Not Responding

**Symptom:** Timeout waiting for subagent

**Diagnosis:**
1. Subagent crashed or errored
2. Network issue
3. Resource exhaustion

**Solution:**
- Check subagent logs
- Verify network connectivity
- Reduce scope/complexity of request

## Performance Benchmarks

### Expected Execution Times

| Command | Depth | Expected Time |
|---------|-------|----------------|
| audit-design | quick | 1-2 minutes |
| audit-design | standard | 3-5 minutes |
| audit-design | deep | 5-10 minutes |
| accessibility-check | AA | 2-4 minutes |
| visual-consistency | - | 2-3 minutes |
| component-audit | - | 3-5 minutes |
| design-debt-report | - | 2-3 minutes |

### Resource Requirements

- **Memory:** 512MB minimum (1GB recommended)
- **Network:** Stable internet connection for Gemini API
- **Disk:** 100MB for screenshots and artifacts
- **CPU:** 2+ cores recommended

## Release Checklist

Before releasing to production:

- [ ] All tests pass
- [ ] Documentation is complete and accurate
- [ ] README.md is up-to-date
- [ ] Plugin manifest is valid
- [ ] All commands are tested
- [ ] All agents are tested
- [ ] All skills are accessible
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
- Average execution time
- Error rate
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
