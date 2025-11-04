/**
 * Dynamic Cache Busting Utility for CLS Employee System
 * 
 * This utility provides multiple cache busting strategies:
 * 1. Timestamp-based cache busting
 * 2. Version-based cache busting
 * 3. Hash-based cache busting
 * 4. Deploy-time cache busting
 */

class CacheBuster {
    constructor(options = {}) {
        this.strategy = options.strategy || 'timestamp'; // 'timestamp', 'version', 'hash', 'deploy'
        this.version = options.version || this.getVersionFromDate();
        this.deployTime = options.deployTime || this.getDeployTime();
        this.prefix = options.prefix || 'v';
    }

    /**
     * Generate version string from current date
     * @returns {string} Version string like "2025-11-04"
     */
    getVersionFromDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get deploy time (could be set during build process)
     * @returns {number} Timestamp
     */
    getDeployTime() {
        // In a real deployment, this could be injected during build
        // For now, we'll use a reasonable timestamp
        return Date.now();
    }

    /**
     * Generate cache busting parameter
     * @param {string} filename - The filename to bust cache for
     * @returns {string} Cache busting parameter
     */
    generateCacheBuster(filename = '') {
        switch (this.strategy) {
            case 'timestamp':
                return `${this.prefix}=${Date.now()}`;
            
            case 'version':
                const pageType = this.getPageType();
                return `${this.prefix}=${this.version}-${pageType}`;
            
            case 'hash':
                // Simple hash based on filename and timestamp
                const hash = this.simpleHash(filename + this.deployTime);
                return `${this.prefix}=${hash}`;
            
            case 'deploy':
                return `${this.prefix}=${this.deployTime}`;
            
            default:
                return `${this.prefix}=${this.version}`;
        }
    }

    /**
     * Get current page type for contextual cache busting
     * @returns {string} Page type
     */
    getPageType() {
        const body = document.body;
        const pageAttr = body?.getAttribute('data-page');
        
        if (pageAttr) return pageAttr;
        
        // Fallback: derive from URL
        const path = window.location.pathname;
        if (path.includes('signup')) return 'signup';
        if (path.includes('login')) return 'login';
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('dev')) return 'dev';
        
        return 'general';
    }

    /**
     * Simple hash function for cache busting
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Add cache busting to a URL
     * @param {string} url - Original URL
     * @param {string} filename - Optional filename for context
     * @returns {string} URL with cache busting parameter
     */
    bustUrl(url, filename = '') {
        const separator = url.includes('?') ? '&' : '?';
        const cacheBuster = this.generateCacheBuster(filename);
        return `${url}${separator}${cacheBuster}`;
    }

    /**
     * Update all CSS links with cache busting
     */
    bustAllCSS() {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.includes('?v=')) {
                const filename = href.split('/').pop();
                link.href = this.bustUrl(href, filename);
            }
        });
    }

    /**
     * Update all script tags with cache busting
     */
    bustAllJS() {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.getAttribute('src');
            if (src && !src.startsWith('http') && !src.includes('?v=')) {
                const filename = src.split('/').pop();
                script.src = this.bustUrl(src, filename);
            }
        });
    }

    /**
     * Update specific resource with cache busting
     * @param {string} selector - CSS selector for the element
     * @param {string} attribute - Attribute to update (href, src, etc.)
     */
    bustResource(selector, attribute = 'href') {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const url = element.getAttribute(attribute);
            if (url && !url.startsWith('http')) {
                const filename = url.split('/').pop();
                element.setAttribute(attribute, this.bustUrl(url, filename));
            }
        });
    }

    /**
     * Initialize cache busting for the current page
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        const config = {
            css: true,
            js: true,
            images: false,
            ...options
        };

        if (config.css) this.bustAllCSS();
        if (config.js) this.bustAllJS();
        if (config.images) {
            this.bustResource('img[src]', 'src');
        }

        console.log('✅ Cache busting initialized with strategy:', this.strategy);
    }
}

// Auto-initialize cache buster if the script is loaded directly
if (typeof window !== 'undefined') {
    // Determine strategy based on environment
    const isDev = document.body?.getAttribute('data-page')?.includes('dev') || 
                  window.location.pathname.includes('dev');
    
    const strategy = isDev ? 'timestamp' : 'version';
    
    window.cacheBuster = new CacheBuster({ strategy });
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Don't auto-bust existing versioned resources
            window.cacheBuster.init({ css: false, js: false });
        });
    }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheBuster;
}