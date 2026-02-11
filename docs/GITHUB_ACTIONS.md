# GitHub Actions Workflow Guide

Complete guide for triggering and using CI/CD workflows in the ai-vision-mcp project.

## Quick Reference

| Workflow | Trigger | Duration | API Key Required |
|----------|---------|----------|------------------|
| **CI (Lint & Build)** | Push/PR to main | 2 min | No |
| **E2E Tests (No API)** | Push/PR to main | 2 min | No |
| **E2E Integration** | Manual/Label | 10-15 min | Yes |
| **Publish Dev** | Tag with `-dev` | 2 min | No |
| **Publish Beta** | Tag with `-beta` | 2 min | No |
| **Publish Latest** | GitHub Release | 2 min | No |

---

## 1. CI Workflow (Lint & Build)

**File:** `.github/workflows/ci.yml`

### Automatic Trigger
Runs on every:
- Push to `main` branch
- Pull request to `main` branch

### What It Does
1. Installs dependencies (`npm ci`)
2. Runs ESLint (`npm run lint`)
3. Builds TypeScript (`npm run build`)
4. Verifies package can be imported

### Check Status
```bash
# View latest run
gh run list --workflow=CI --limit 1

# View logs
gh run view --workflow=CI
```

---

## 2. E2E Tests (No API Calls)

**File:** `.github/workflows/e2e-tests.yml`

### Automatic Trigger
Runs on every:
- Push to `main` or `develop` branch
- Pull request to `main` branch

### What It Does
- Protocol tests (MCP compliance)
- Validation tests (input validation)
- **No API calls** - uses dummy API key

### Check Status
```bash
gh run list --workflow="E2E Tests (No API)" --limit 1
```

---

## 3. E2E Integration Tests (With API Calls)

**File:** `.github/workflows/e2e-integration.yml`

### Trigger Method 1: Manual (Recommended)

Go to GitHub → Actions → E2E Integration Tests → Run workflow

Select test type:
- `all` - Run both CLI and integration tests
- `cli` - Run only CLI tests
- `integration` - Run only integration tests

### Trigger Method 2: PR Label

```bash
# Add label to run tests
gh pr edit <PR_NUMBER> --add-label "e2e-integration"

# Remove label to skip tests
gh pr edit <PR_NUMBER> --remove-label "e2e-integration"
```

### Required Secrets

Set these in GitHub → Settings → Secrets → Actions:

| Secret | Required | Description |
|--------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Gemini API key |
| `GEMINI_BASE_URL` | No | Custom proxy URL |
| `IMAGE_MODEL` | No | Image model (default: gemini-2.0-flash-lite) |
| `VIDEO_MODEL` | No | Video model (default: gemini-2.0-flash-lite) |

---

## 4. NPM Publishing

### Dev Version

**File:** `.github/workflows/publish-to-npm-dev.yml`

**Trigger via tag:**
```bash
git tag v0.0.5-dev.1
git push origin v0.0.5-dev.1
```

**Trigger manually:**
Go to GitHub → Actions → Publish to npm (dev) → Run workflow

**Install:**
```bash
npm install ai-vision-mcp@dev
```

---

### Beta Version

**File:** `.github/workflows/publish-to-npm-beta-on-tag.yml`

**Trigger via tag:**
```bash
git tag v0.0.5-beta.1
git push origin v0.0.5-beta.1
```

**Install:**
```bash
npm install ai-vision-mcp@beta
```

---

### Production (Latest)

**File:** `.github/workflows/publish-to-npm-latest-on-release.yml`

**Trigger via GitHub Release:**

1. Go to GitHub → Releases → Draft new release
2. Click "Choose a tag"
3. Type new version (e.g., `v0.0.6`)
4. Click "Create new tag: v0.0.6 on publish"
5. Add release title and description
6. Click "Publish release"

**Install:**
```bash
npm install ai-vision-mcp
# or
npm install ai-vision-mcp@latest
```

---

### Manual Publishing

**File:** `.github/workflows/publish-to-npm-manual.yml`

**Trigger:**
Go to GitHub → Actions → Publish to npm (manual) → Run workflow

Select tag:
- `dev` - Publish as dev version
- `beta` - Publish as beta version
- `latest` - Publish as latest version

---

## Publishing Checklists

### Development Testing Workflow

```bash
# Step 1: Make changes and commit
git add .
git commit -m "feat: my new feature"
git push

# Step 2: Wait for CI to pass
# Check: https://github.com/tan-yong-sheng/ai-vision-mcp/actions

# Step 3: Create dev tag
git tag v0.0.5-dev.1
git push origin v0.0.5-dev.1

# Step 4: Check publish status in Actions tab

# Step 5: Install and test
npm install ai-vision-mcp@dev
```

### Beta Release Workflow

```bash
# Step 1: Create beta tag
git tag v0.0.5-beta.1
git push origin v0.0.5-beta.1

# Step 2: Verify publish in Actions tab

# Step 3: Users can install with
npm install ai-vision-mcp@beta
```

### Production Release Workflow

```bash
# Step 1: Go to GitHub → Releases
# Step 2: Click "Draft new release"
# Step 3: Create new tag (e.g., v0.0.6)
# Step 4: Fill in release notes
# Step 5: Click "Publish release"
# Step 6: Verify npm publish in Actions tab
```

---

## Required Secrets

Configure these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Used In | Required | Description |
|--------|---------|----------|-------------|
| `NPM_TOKEN` | Publishing workflows | Yes | NPM authentication token |
| `GEMINI_API_KEY` | E2E Integration | For API tests | Gemini API key |
| `GEMINI_BASE_URL` | E2E Integration | Optional | Custom proxy URL |
| `IMAGE_MODEL` | E2E Integration | Optional | Model for images |
| `VIDEO_MODEL` | E2E Integration | Optional | Model for video |

---

## Troubleshooting

### CI Workflow Fails

**Issue:** Lint or build errors
**Solution:**
```bash
npm run lint
npm run build
# Fix any errors locally before pushing
```

### E2E Tests Timeout

**Issue:** Validation tests hang
**Solution:**
- These are known issues with provider initialization
- Use E2E Tests (No API) for quick validation
- Use manual trigger for API tests when needed

### NPM Publish Fails

**Issue:** "You do not have permission"
**Solution:**
- Verify `NPM_TOKEN` is set in secrets
- Ensure token has publish access
- Check package name is unique

### E2E Integration Tests Fail

**Issue:** API rate limits or timeouts
**Solution:**
- Check `GEMINI_API_KEY` is valid
- Verify API key has quota remaining
- Run tests manually during off-peak hours

---

## Viewing Workflow Status

### Via GitHub CLI

```bash
# List recent runs
gh run list --limit 5

# View specific workflow
gh run list --workflow="E2E Tests (No API)"

# View logs for latest run
gh run view --logs

# Watch running workflow
gh run watch
```

### Via Web Browser

Go to: https://github.com/tan-yong-sheng/ai-vision-mcp/actions

---

## Summary

- **CI and E2E (No API)** run automatically on push/PR
- **E2E Integration** requires manual trigger or label
- **Publishing** requires explicit tag or release
- All workflows documented for easy reference
