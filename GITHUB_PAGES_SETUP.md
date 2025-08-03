# GitHub Pages Setup Instructions

This document provides instructions for setting up GitHub Pages to work with this SPA (Single Page Application).

## Required GitHub Repository Settings

To resolve Jekyll processing errors and enable proper SPA deployment:

### 1. Access Repository Settings
1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar

### 2. Configure Pages Source
**IMPORTANT**: Change the source configuration to:

**Option A: GitHub Actions (Recommended)**
- Source: **GitHub Actions**
- This completely bypasses Jekyll processing

**Option B: Deploy from branch**
- Source: **Deploy from a branch**
- Branch: **main** (or your default branch)
- Folder: **/ (root)** or **/docs**

### 3. Verify Settings
After changing settings:
1. Wait 5-10 minutes for propagation
2. Check that deployments use GitHub Actions instead of Jekyll
3. Verify the site loads at `https://[username].github.io/[repository]`

## Troubleshooting

### Jekyll Processing Error
If you see errors like:
```
Error: No such file or directory @ dir_chdir0 - /github/workspace/docs
```

This means Jekyll is still being used. Follow these steps:
1. Ensure GitHub Pages source is set to "GitHub Actions"
2. Verify `.nojekyll` file exists in the deployed site
3. Check that the GitHub Actions workflow is running instead of Jekyll

### SPA Routing Issues
If client-side routing (like `/#demo`) doesn't work:
1. Verify `404.html` exists and contains the same content as `index.html`
2. Ensure `.nojekyll` file is present to disable Jekyll processing
3. Check that the `base` URL in vite.config.ts matches your repository name

## Technical Details

### Files Required for SPA on GitHub Pages
- `.nojekyll` - Disables Jekyll processing
- `404.html` - Enables client-side routing fallback
- `index.html` - Main application entry point

### URL Structure
- **Live Site**: `https://[username].github.io/[repository]`
- **Demo Mode**: `https://[username].github.io/[repository]/#demo`

## Automation

The GitHub Actions workflow in `.github/workflows/deploy.yml` automatically:
1. Builds the application for GitHub Pages
2. Creates required `.nojekyll` and `404.html` files
3. Uploads the artifact for Pages deployment
4. Deploys without Jekyll processing

This setup ensures reliable SPA deployment with hash-based routing support.