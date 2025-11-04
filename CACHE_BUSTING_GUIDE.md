# Cache Busting Implementation Guide

## Overview

This document outlines the cache busting strategies implemented for the CLS Employee Login System to ensure users always receive the latest versions of CSS, JavaScript, and other static assets.

## Current Implementation

### 1. Manual Version Parameters (Primary Method)

**Location:** All HTML files  
**Format:** `?v=YYYY-MM-DD-context`

```html
<!-- Production -->
<link rel="stylesheet" href="css/style.css?v=2025-11-04">
<script src="js/script.js?v=2025-11-04-signup"></script>

<!-- Development -->
<link rel="stylesheet" href="css/style.css?v=2025-11-04-dev">
<script src="js/script.js?v=2025-11-04-dev-signup"></script>
```

### 2. Dynamic Cache Busting Utility

**File:** `js/cache-buster.js`  
**Purpose:** Provides runtime cache busting for dynamically loaded resources

```javascript
// Auto-initializes based on environment
const cacheBuster = new CacheBuster({ strategy: 'version' });

// Manual usage
const bustedUrl = cacheBuster.bustUrl('css/newstyle.css');
// Result: css/newstyle.css?v=2025-11-04-signup
```

### 3. Automated Update Script

**File:** `update-cache-busting.ps1`  
**Purpose:** Batch update cache busting parameters across all HTML files

```powershell
# Update all files with current date
.\update-cache-busting.ps1

# Update only development files
.\update-cache-busting.ps1 -DevOnly

# Preview changes without applying
.\update-cache-busting.ps1 -DryRun

# Use custom version
.\update-cache-busting.ps1 -Strategy custom -CustomVersion "v2.1.0"
```

## Cache Busting Strategies

### 1. Date-based (Default)
- **Format:** `YYYY-MM-DD`
- **Use case:** Regular updates, daily deployments
- **Example:** `?v=2025-11-04`

### 2. Timestamp-based
- **Format:** Unix timestamp
- **Use case:** Development, frequent updates
- **Example:** `?v=1730736000`

### 3. Hash-based
- **Format:** 8-character hash
- **Use case:** Content-based cache invalidation
- **Example:** `?v=a1b2c3d4`

### 4. Custom Version
- **Format:** User-defined
- **Use case:** Semantic versioning, release-based
- **Example:** `?v=2.1.0`

## Environment-Specific Patterns

### Production Files
- **Pattern:** `?v=YYYY-MM-DD-context`
- **Files:** `employeeSignup.html`, `employeelogin.html`, etc.
- **Context:** Page-specific identifier

### Development Files
- **Pattern:** `?v=YYYY-MM-DD-dev-context`
- **Files:** `employeeSignup-dev.html`, `employeelogin-dev.html`, etc.
- **Context:** Page-specific identifier with `-dev` suffix

## Best Practices

### 1. Update Timing
- Update cache busting parameters when:
  - CSS styles are modified
  - JavaScript functionality is changed
  - Critical bug fixes are deployed
  - New features are released

### 2. Version Consistency
- Use the same base version across related files
- Add specific context for page-specific assets
- Maintain separate versioning for dev/prod environments

### 3. Deployment Workflow
```bash
# 1. Update cache busting parameters
.\update-cache-busting.ps1

# 2. Test locally
# Browse to employeeSignup.html and verify assets load

# 3. Commit changes
git add .
git commit -m "Update cache busting for signup page fixes"

# 4. Deploy to production
git push origin main
```

### 4. Testing Cache Busting
```javascript
// Check if cache busting is working
console.log('CSS loaded with version:', 
  document.querySelector('link[href*="style.css"]').href);

// Verify dynamic cache buster
if (window.cacheBuster) {
  console.log('Cache buster available:', window.cacheBuster.strategy);
}
```

## Troubleshooting

### Common Issues

#### 1. Cached Old Versions
**Problem:** Users still see old content after updates  
**Solution:** 
- Verify version parameters are updated in HTML
- Check browser dev tools to confirm new URLs are loading
- Consider using timestamp strategy for immediate effect

#### 2. Mixed Versions
**Problem:** Some assets have new versions, others don't  
**Solution:** 
- Run `update-cache-busting.ps1` to ensure consistency
- Manually verify all `<link>` and `<script>` tags

#### 3. Service Worker Caching
**Problem:** PWA service worker caches old versions  
**Solution:** 
- Update service worker version numbers
- Clear service worker cache in dev tools
- Implement cache clearing in service worker update logic

### Debug Commands

```powershell
# Check current versions in all files
Select-String -Path "*.html" -Pattern '\?v=' | Select-Object Filename, Line

# Find files without cache busting
Select-String -Path "*.html" -Pattern 'href="css/.*\.css"[^?]' | Select-Object Filename, Line

# Verify cache buster script is included
Select-String -Path "*.html" -Pattern 'cache-buster\.js' | Select-Object Filename, Line
```

## Implementation History

- **2024-11-04:** Implemented comprehensive cache busting system
- **Previous:** Used ad-hoc version parameters like `v=2024-pwa-integration`

## Future Enhancements

1. **Build Integration:** Integrate with npm scripts for automatic versioning
2. **Content Hashing:** Generate versions based on actual file content
3. **CDN Integration:** Coordinate with CDN cache invalidation
4. **Performance Monitoring:** Track cache hit/miss rates

### Files Modified

### HTML Files
- `employeeSignup.html` - Updated to `v=2025-11-04`
- `employeeSignup-dev.html` - Updated to `v=2025-11-04-dev`
- `employeelogin.html` - Updated to `v=2025-11-04`
- `employeeDashboard.html` - Updated to `v=2025-11-04`

### New Files
- `js/cache-buster.js` - Dynamic cache busting utility
- `update-cache-busting.ps1` - Automated update script
- `CACHE_BUSTING_GUIDE.md` - This documentation

### Next Steps
1. Apply same cache busting to remaining pages (index.html, etc.)
2. Test cache busting effectiveness
3. Integrate with build/deployment pipeline
4. Monitor performance impact

## Current Implementation Status

### ✅ **Completed:**
- Employee Signup (production + dev)
- Employee Login (production only, no dev version exists)
- Employee Dashboard (production only, no dev version exists)
- Cache busting utility script
- Automated PowerShell update script

### 📋 **To Do:**
- Apply to index.html and other static pages
- Create dev versions of login/dashboard if needed
- Test cache effectiveness in production