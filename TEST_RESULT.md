# AI Vision CLI Test Results

Generated: 2026-04-04

## Build
- `npm run build`: passed

## Skill example run
- Script: `scripts/run_skill_examples.sh`
- Output file: `RESULT.md`
- Verification: rerun the script cases through `ai-vision-local-mcp`

## Summary
- Total cases: 10
- Passed: 10
- Failed: 0

## Cases
- analyze-image url: PASS
- analyze-image local file: PASS
- analyze-image base64: PASS
- compare-images two urls: PASS
- compare-images three urls: PASS
- detect-objects url: PASS
- detect-objects local file: PASS
- analyze-video remote url: PASS
- analyze-video local file: PASS
- analyze-video youtube: PASS

## Notes
- Local file cases passed when using absolute Windows paths.
- The earlier `/tmp/...` paths failed because the MCP file loader resolved them as Windows paths.
