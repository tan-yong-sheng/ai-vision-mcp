# CI/CD Implementation Guide

## Overview

This document describes the CI/CD workflows for the ai-vision-mcp npm package.

## Workflow Files

All workflow files follow a clear naming pattern:
- `publish-to-npm-{TAG}-on-{TRIGGER}.yml` - Automatic workflows
- `publish-to-npm-manual.yml` - Manual workflow with parameters

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**
- Runs linter
- Builds TypeScript
- Verifies package can be imported

**Purpose:** Quality gates before merging code.

---

### 2. Automatic Publish Workflows

These workflows publish automatically based on triggers:

#### Dev Releases (`.github/workflows/publish-to-npm-dev-on-push.yml`)

**When it runs:** Every push to `main` branch

**npm tag:** `dev`

**Version format:** `{BASE_VERSION}-dev.{DATE}.{SHA}` (e.g., `0.0.5-dev.20260111.abc123`)

**Use case:** Continuous development builds, always up-to-date with main

**Install:**
```bash
npm install ai-vision-mcp@dev
```

---

#### Beta Releases (`.github/workflows/publish-to-npm-beta-on-tag.yml`)

**When it runs:** Push of tags matching `v*.*.*-beta.*`

**npm tag:** `beta`

**How to release:**
```bash
npm version prerelease --preid=beta  # Creates 0.0.6-beta.0
git push && git push --tags
```

**Use case:** Pre-release versions for testing

**Install:**
```bash
npm install ai-vision-mcp@beta
```

---

#### Latest/Production Releases (`.github/workflows/publish-to-npm-latest-on-release.yml`)

**When it runs:** GitHub Release is published

**npm tag:** `latest` (default)

**How to release:**
```bash
npm version patch  # or minor, major
git push && git push --tags
# Then create GitHub Release at https://github.com/tan-yong-sheng/ai-vision-mcp/releases
```

**Use case:** Stable production releases

**Install:**
```bash
npm install ai-vision-mcp  # or ai-vision-mcp@latest
```

---

### 3. Manual Publish Workflow (`.github/workflows/publish-to-npm-manual.yml`)

**When it runs:** Manually triggered from GitHub Actions UI

**Parameters:**
- **Version bump type:** patch, minor, major, or prerelease
- **Pre-release ID:** For prerelease versions (e.g., "alpha", "beta")
- **npm tag:** latest, beta, alpha, or dev

**Use case:**
- Custom releases not covered by automatic workflows
- Emergency releases
- Testing different version bumps

**How to use:**
1. Go to GitHub → Actions → "Publish to npm (manual)"
2. Click "Run workflow"
3. Select options:
   - Version bump: `patch` (or your choice)
   - Pre-release ID: (leave empty for stable, or enter "alpha")
   - npm tag: `latest` (or `beta`, `alpha`, `dev`)
4. Click "Run workflow"

---

## npm Tags Summary

| Tag | Install Command | When Updated |
|-----|-----------------|--------------|
| `latest` | `npm i ai-vision-mcp` | On GitHub Release |
| `beta` | `npm i ai-vision-mcp@beta` | On beta tag push |
| `dev` | `npm i ai-vision-mcp@dev` | On every push to main |

---

## Setup Requirements

### 1. Create NPM Token

1. Go to [npmjs.com](https://www.npmjs.com/) → Access Tokens → Generate New Token
2. Select **"Granular access token"**
3. Configure:
   - Name: `ai-vision-mcp-github-actions`
   - Expiration: 1 year (set reminder to rotate)
   - Packages: Only `ai-vision-mcp`
   - Permissions: Read and write

### 2. Add to GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Your granular access token

---

## Release Process Examples

### Quick Dev Release (Automatic)

Just push to main:
```bash
git add .
git commit -m "feat: some feature"
git push origin main
# Workflow automatically publishes dev version
```

### Beta Release (Automatic)

```bash
npm version prerelease --preid=beta  # 0.0.5 → 0.0.6-beta.0
git push && git push --tags
# Workflow automatically publishes beta version
```

### Production Release (Automatic)

```bash
npm version patch  # 0.0.5 → 0.0.6
git push && git push --tags
# Go to GitHub → Releases → Create release from tag
# Workflow publishes to latest when release is published
```

### Manual Release (Any tag)

Go to GitHub Actions → "Publish to npm (manual)" → Run workflow

---

## Security Features

- **Granular Access Token:** Package-specific, no 2FA required for CI
- **Provenance Attestation:** Supply chain security via `--provenance` flag
- **Version Verification:** Ensures package.json matches release tag
- **OIDC Support:** Uses GitHub's OIDC for secure npm authentication

---

## Troubleshooting

### "npm ERR! 403 Forbidden"

- Check that `NPM_TOKEN` secret is set correctly
- Verify token has "Read and write" permissions
- Ensure token is not expired

### Version mismatch error

- For production: tag `v0.0.6` requires package.json version `0.0.6`
- For beta: tag `v0.0.6-beta.0` requires package.json version `0.0.6-beta.0`

### Beta tag not triggering workflow

- Tag must match pattern: `v*.*.*-beta.*`
- Push the tag: `git push origin v0.0.6-beta.0`

---

## Files Created

- `.github/workflows/ci.yml` - Quality gates
- `.github/workflows/publish-to-npm-dev-on-push.yml` - Dev releases
- `.github/workflows/publish-to-npm-beta-on-tag.yml` - Beta releases
- `.github/workflows/publish-to-npm-latest-on-release.yml` - Production releases
- `.github/workflows/publish-to-npm-manual.yml` - Manual releases with parameters
- `docs/llm_logs/ci-cd-implementation.md` - This guide
