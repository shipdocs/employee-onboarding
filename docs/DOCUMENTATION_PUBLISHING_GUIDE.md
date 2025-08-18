# Documentation Publishing Guide

## Overview

This guide provides multiple options for publishing your Maritime Onboarding System documentation as a professional, searchable documentation site.

## Recommended Options (Ranked by Ease of Use)

### Option 1: Docusaurus (Facebook) - ⭐ RECOMMENDED
**Best for:** Modern, feature-rich documentation with minimal setup

**Pros:**
- Built specifically for documentation sites
- Excellent search (Algolia integration)
- Versioning support
- Dark mode built-in
- MDX support (React components in Markdown)
- Free GitHub Pages hosting
- Active community

**Setup Time:** 30 minutes

**Quick Setup:**
```bash
# Create new repo: maritime-onboarding-docs
cd maritime-onboarding-docs
npx create-docusaurus@latest docs classic
cd docs

# Copy sanitized docs
cp -r ../new-onboarding-2025/docs-public/* docs/

# Configure and deploy
npm run build
npm run deploy  # Deploys to GitHub Pages
```

**Live Example:** https://docusaurus.io/docs

### Option 2: MkDocs Material - ⭐⭐
**Best for:** Python developers, Material Design lovers

**Pros:**
- Beautiful Material Design
- Excellent search
- Easy configuration (YAML)
- Extensive theme customization
- Free hosting on GitHub Pages
- Great for technical docs

**Setup Time:** 20 minutes

**Quick Setup:**
```bash
# Install MkDocs
pip install mkdocs-material

# Create new repo and structure
mkdocs new maritime-onboarding-docs
cd maritime-onboarding-docs

# Copy docs and configure mkdocs.yml
# Deploy to GitHub Pages
mkdocs gh-deploy
```

**Live Example:** https://squidfunk.github.io/mkdocs-material/

### Option 3: GitHub Wiki
**Best for:** Simplest solution, no build process

**Pros:**
- Zero setup
- Built into GitHub
- Automatic search
- Version control
- No hosting needed

**Cons:**
- Limited customization
- No custom domain
- Basic search only

**Setup Time:** 5 minutes

### Option 4: GitBook
**Best for:** Non-technical users, WYSIWYG editing

**Pros:**
- Beautiful default theme
- Great search
- Easy collaboration
- No coding required
- Free for open source

**Cons:**
- Less customization
- Vendor lock-in

**Setup Time:** 15 minutes

### Option 5: VuePress
**Best for:** Vue.js developers

**Pros:**
- Vue-powered
- Fast performance
- Good default theme
- Markdown extensions

**Setup Time:** 30 minutes

## Step-by-Step: Docusaurus Setup (Recommended)

### 1. Prepare Your Documentation

```bash
# First, sanitize your docs
cd new-onboarding-2025
node scripts/sanitize-docs-for-public.js

# This creates a 'docs-public' folder with sanitized content
```

### 2. Create Documentation Repository

```bash
# Create new repository on GitHub: maritime-onboarding-docs

# Clone and set up Docusaurus
git clone https://github.com/yourusername/maritime-onboarding-docs.git
cd maritime-onboarding-docs

# Initialize Docusaurus
npx create-docusaurus@latest . classic --typescript

# Remove default docs
rm -rf docs/*

# Copy your sanitized documentation
cp -r ../new-onboarding-2025/docs-public/* docs/
```

### 3. Configure Docusaurus

Edit `docusaurus.config.js`:

```javascript
module.exports = {
  title: 'Maritime Onboarding System',
  tagline: 'Comprehensive documentation for the Maritime Onboarding platform',
  url: 'https://yourusername.github.io',
  baseUrl: '/maritime-onboarding-docs/',
  
  organizationName: 'yourusername',
  projectName: 'maritime-onboarding-docs',
  
  themeConfig: {
    navbar: {
      title: 'Maritime Onboarding',
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/yourusername/maritime-onboarding-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Maritime Onboarding System`,
    },
    // Algolia search configuration
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'maritime_onboarding',
    },
  },
};
```

### 4. Create Sidebar Configuration

Create `sidebars.js`:

```javascript
module.exports = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/first-steps',
        'getting-started/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'For Developers',
      items: [
        'for-developers/README',
        {
          type: 'category',
          label: 'Architecture',
          items: [
            'for-developers/architecture/overview',
            'for-developers/architecture/database-design',
          ],
        },
        {
          type: 'category',
          label: 'API Reference',
          items: [
            'for-developers/api-reference/README',
            'for-developers/api-reference/authentication',
            'for-developers/api-reference/endpoints/overview',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'For Administrators',
      items: [
        'for-administrators/README',
        'for-administrators/user-guide',
        {
          type: 'category',
          label: 'Deployment',
          items: [
            'for-administrators/deployment/README',
            'for-administrators/deployment/vercel-deployment',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/README',
        'features/authentication',
        'features/training-system',
        'features/certificate-system',
      ],
    },
  ],
};
```

### 5. Fix Remaining Links

Create a script to fix Docusaurus-specific link issues:

```bash
# Create fix-docusaurus-links.js
node -e "
const fs = require('fs');
const path = require('path');

// Fix links in all MD files
function fixLinks(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fixLinks(filePath);
    } else if (file.endsWith('.md')) {
      let content = fs.readFileSync(filePath, 'utf8');
      // Remove .md extensions from links
      content = content.replace(/\.md\)/g, ')');
      // Fix relative paths
      content = content.replace(/\.\.\//g, '../');
      fs.writeFileSync(filePath, content);
    }
  });
}

fixLinks('./docs');
"
```

### 6. Deploy to GitHub Pages

```bash
# Build the site
npm run build

# Deploy to GitHub Pages
GIT_USER=yourusername npm run deploy

# Your docs will be live at:
# https://yourusername.github.io/maritime-onboarding-docs/
```

### 7. Set Up Search (Optional but Recommended)

For Algolia search:
1. Sign up at https://www.algolia.com/users/sign_up
2. Create an index for your docs
3. Use DocSearch: https://docsearch.algolia.com/apply
4. Add credentials to docusaurus.config.js

## GitHub Actions for Continuous Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build website
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

## Automated Link Validation

Add to your CI/CD:

```yaml
- name: Validate Documentation Links
  run: |
    npm install -g markdown-link-check
    find ./docs -name "*.md" -exec markdown-link-check {} \;
```

## Best Practices

1. **Keep Source and Published Docs Separate**
   - Main repo: Contains actual code and raw docs
   - Docs repo: Contains sanitized, published documentation

2. **Automate Sanitization**
   - Run sanitization script in CI/CD
   - Never manually copy sensitive data

3. **Version Your Docs**
   - Tag documentation releases
   - Keep docs in sync with code versions

4. **Monitor Documentation Health**
   - Set up link checking
   - Monitor search analytics
   - Gather user feedback

## Quick Decision Matrix

| Feature | Docusaurus | MkDocs | GitHub Wiki | GitBook |
|---------|------------|---------|-------------|----------|
| Setup Ease | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Customization | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| Search | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Hosting | Free | Free | Free | Free* |
| Build Time | 30min | 20min | 5min | 15min |

*Free for open source

## Next Steps

1. Run the sanitization script:
   ```bash
   node scripts/sanitize-docs-for-public.js
   ```

2. Choose your platform (Docusaurus recommended)

3. Create new GitHub repository

4. Follow platform-specific setup

5. Deploy and share your documentation URL

Your documentation will be professional, searchable, and easy to maintain!