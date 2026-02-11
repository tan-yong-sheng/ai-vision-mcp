# CI/CD Workflows Guide

This document explains the GitHub Actions workflows and how to use them.

## Workflow Overview

### 1. E2E Tests (No API) - `e2e-tests.yml`

**When it runs:**
- On every push to `main` or `develop`
- On every PR to `main`

**What it does:**
- Runs protocol tests (MCP compliance)
- Runs validation tests (input validation)
- **No API calls required** - fast and reliable

**Duration:** ~2 minutes

---

### 2. E2E Integration Tests (With API) - `e2e-integration.yml`

**When it runs:**
- Manual trigger via Actions tab
- PRs with `e2e-integration` label

**What it does:**
- Runs CLI E2E tests (with real API calls)
- Runs integration tests (with real API calls)
- **Requires API key** - may be flaky due to rate limits

**Duration:** ~10-15 minutes

**How to trigger:**

```bash
# Option 1: Add label to PR
gh pr edit <PR_NUMBER> --add-label "e2e-integration"

# Option 2: Manual trigger
# Go to Actions → E2E Integration Tests → Run workflow
```

---

### 3. NPM Publishing Workflows

#### Dev/Beta Versions - `publish-to-npm-dev.yml`

**When it publishes:**
- Tag pushed with `-dev` suffix (e.g., `v1.0.0-dev.1`)
- Manual trigger with version suffix

**How to publish dev version:**

```bash
# Create and push a dev tag
git tag v1.0.0-dev.1
git push origin v1.0.0-dev.1

# Or manual trigger:
# Actions → Publish to npm (dev) → Run workflow
```

#### Beta Versions - `publish-to-npm-beta-on-tag.yml`

**When it publishes:**
- Tag pushed with `-beta` suffix (e.g., `v1.0.0-beta.1`)

**How to publish beta version:**

```bash
# Create and push a beta tag
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

#### Production - `publish-to-npm-latest-on-release.yml`

**When it publishes:**
- GitHub Release is published

**How to publish production version:**

```bash
# Create a GitHub Release (not just a tag)
# This will automatically publish to npm with 'latest' tag
```

#### Manual - `publish-to-npm-manual.yml`

**When it publishes:**
- Only manual trigger

**How to use:**

```bash
# Go to Actions → Publish to npm (manual) → Run workflow
# Select tag: dev, beta, or latest
```

---

## Publishing Checklist

### For Development Testing:

```bash
# 1. Make your changes
git add .
git commit -m "feat: my new feature"
git push

# 2. Create dev tag
git tag v0.0.5-dev.1
git push origin v0.0.5-dev.1

# 3. Wait for workflow to complete
# Check: Actions → Publish to npm (dev)

# 4. Install and test
npm install ai-vision-mcp@dev
```

### For Beta Release:

```bash
# 1. Create beta tag
git tag v0.0.5-beta.1
git push origin v0.0.5-beta.1

# 2. Workflow auto-publishes

# 3. Users can install
npm install ai-vision-mcp@beta
```

### For Production Release:

```bash
# 1. Go to GitHub → Releases → Draft new release
# 2. Choose tag (or create new tag like v0.0.6)
# 3. Publish release
# 4. Workflow auto-publishes to npm with 'latest' tag

# Users install with:
npm install ai-vision-mcp
# or
npm install ai-vision-mcp@latest
```

---

## Environment Variables

Required secrets for API tests and publishing:

| Secret | Used In | Description |
|--------|---------|-------------|
| `GEMINI_API_KEY` | e2e-integration.yml | Gemini API key |
| `GEMINI_BASE_URL` | e2e-integration.yml | Custom proxy URL (optional) |
| `IMAGE_MODEL` | e2e-integration.yml | Model for images (optional) |
| `VIDEO_MODEL` | e2e-integration.yml | Model for video (optional) |
| `NPM_TOKEN` | publish-to-npm-*.yml | NPM authentication token |

---

## Summary

| Workflow | Trigger | Duration | API Key |
|----------|---------|----------|---------|
| E2E Tests (No API) | Push/PR | 2 min | No |
| E2E Integration | Manual/Label | 10-15 min | Yes |
| Publish Dev | Tag with `-dev` | 2 min | No |
| Publish Beta | Tag with `-beta` | 2 min | No |
| Publish Latest | GitHub Release | 2 min | No |
