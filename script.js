/**
 * Optimized Portfolio Website Interactive Features
 * Enhanced performance with efficient DOM handling, better event management, and optimized animations
 */

class PortfolioController {
    constructor() {
        this.config = {
            typewriter: {
                strings: ['Full-Stack Developer', 'Application Developer', 'Problem Solver'],
                typeSpeed: 50,
                backSpeed: 30,
                backDelay: 1500,
                loop: true
            },
            scroll: {
                headerOffset: 80,
                sectionHighlightOffset: 100,
                scrollTopThreshold: 300,
                throttleDelay: 16 // ~60fps
            }
        };
        
        this.elements = new Map();
        this.sectionData = [];
        this.lastScrollY = 0;
        this.ticking = false;
        this.activeSection = '';
        this.isScrollTopVisible = false;
        
        this.init();
    }

    /**
     * Initialize all portfolio features with performance optimizations
     */
    async init() {
        try {
            await this.waitForDOM();
            this.cacheElements();
            this.precomputeSectionData();
            this.initTypewriter();
            this.bindEvents();
        } catch (error) {
            console.error('Portfolio initialization failed:', error);
        }
    }

    /**
     * Wait for DOM to be fully ready
     */
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            } else {
                resolve();
            }
        });
    }

    /**
     * Cache DOM elements using Map for O(1) lookups
     */
    cacheElements() {
        const selectors = {
            typewriterElement: '#element',
            navLinks: 'a[href^="#"]',
            sections: 'section[id]',
            navItems: 'nav ul li a[href^="#"]',
            scrollTopBtn: '.scroll-top'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            const isMultiple = ['navLinks', 'sections', 'navItems'].includes(key);
            const elements = isMultiple 
                ? Array.from(document.querySelectorAll(selector))
                : document.querySelector(selector);
            
            if (elements && (!isMultiple || elements.length > 0)) {
                this.elements.set(key, elements);
            }
        }
    }

    /**
     * Precompute section positions and data for efficient scroll handling
     */
    precomputeSectionData() {
        const sections = this.elements.get('sections');
        if (!sections) return;

        this.sectionData = sections.map(section => ({
            id: section.id,
            element: section,
            top: 0, // Will be updated on resize
            height: 0 // Will be updated on resize
        }));

        this.updateSectionPositions();
        
        // Update positions on resize with debouncing
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateSectionPositions(), 150);
        }, { passive: true });
    }

    /**
     * Update cached section positions
     */
    updateSectionPositions() {
        this.sectionData.forEach(data => {
            const rect = data.element.getBoundingClientRect();
            data.top = rect.top + window.pageYOffset;
            data.height = rect.height;
        });
    }

    /**
     * Initialize typewriter with error handling
     */
    initTypewriter() {
        const element = this.elements.get('typewriterElement');
        if (!element || typeof Typed === 'undefined') {
            console.warn('Typewriter dependencies not available');
            return;
        }

        try {
            this.typewriter = new Typed('#element', this.config.typewriter);
        } catch (error) {
            console.error('Typewriter initialization failed:', error);
        }
    }

    /**
     * Bind events with passive listeners and delegation where possible
     */
    bindEvents() {
        this.bindSmoothScrolling();
        this.bindScrollEvents();
        this.bindScrollToTop();
    }

    /**
     * Use event delegation for navigation links
     */
    bindSmoothScrolling() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                this.handleSmoothScroll(e, link);
            }
        });
    }

    /**
     * Optimized smooth scroll with native Intersection Observer fallback
     * @param {Event} e - Click event
     * @param {Element} link - Clicked link element
     */
    handleSmoothScroll(e, link) {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (!targetElement) return;

        const targetPosition = targetElement.offsetTop - this.config.scroll.headerOffset;
        
        // Use native scroll behavior when supported
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        } else {
            // Fallback smooth scroll for older browsers
            this.smoothScrollFallback(targetPosition);
        }
    }

    /**
     * Fallback smooth scroll implementation
     * @param {number} targetPosition - Target scroll position
     */
    smoothScrollFallback(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500;
        let startTime = null;

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Easing function
            const ease = progress * (2 - progress);
            
            window.scrollTo(0, startPosition + (distance * ease));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }

    /**
     * Optimized scroll event handling with requestAnimationFrame
     */
    bindScrollEvents() {
        window.addEventListener('scroll', () => {
            this.lastScrollY = window.pageYOffset;
            this.requestTick();
        }, { passive: true });
    }

    /**
     * Request animation frame for scroll updates
     */
    requestTick() {
        if (!this.ticking) {
            requestAnimationFrame(() => this.updateOnScroll());
            this.ticking = true;
        }
    }

    /**
     * Batched scroll updates for better performance
     */
    updateOnScroll() {
        this.updateActiveNavigation();
        this.updateScrollTopButton();
        this.ticking = false;
    }

    /**
     * Efficient active navigation update using precomputed data
     */
    updateActiveNavigation() {
        const scrollPosition = this.lastScrollY;
        const offset = this.config.scroll.sectionHighlightOffset;
        let newActiveSection = '';

        // Find active section using precomputed data
        for (const section of this.sectionData) {
            if (scrollPosition >= section.top - offset &&
                scrollPosition < section.top + section.height - offset) {
                newActiveSection = section.id;
                break;
            }
        }

        // Only update DOM if active section changed
        if (newActiveSection !== this.activeSection) {
            this.activeSection = newActiveSection;
            this.updateNavigationHighlight();
        }
    }

    /**
     * Update navigation highlight efficiently
     */
    updateNavigationHighlight() {
        const navItems = this.elements.get('navItems');
        if (!navItems) return;

        const targetHref = `#${this.activeSection}`;
        
        navItems.forEach(item => {
            const isActive = item.getAttribute('href') === targetHref;
            item.classList.toggle('active', isActive);
        });
    }

    /**
     * Efficient scroll-to-top button visibility toggle
     */
    updateScrollTopButton() {
        const shouldShow = this.lastScrollY > this.config.scroll.scrollTopThreshold;
        
        if (shouldShow !== this.isScrollTopVisible) {
            this.isScrollTopVisible = shouldShow;
            const btn = this.elements.get('scrollTopBtn');
            if (btn) {
                btn.classList.toggle('active', shouldShow);
            }
        }
    }

    /**
     * Bind scroll-to-top with single event listener
     */
    bindScrollToTop() {
        const btn = this.elements.get('scrollTopBtn');
        if (!btn) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToTop();
        });
    }

    /**
     * Optimized scroll to top
     */
    scrollToTop() {
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            this.smoothScrollFallback(0);
        }
    }

    /**
     * Enhanced cleanup with proper resource management
     */
    destroy() {
        // Cancel any pending animation frames
        if (this.ticking) {
            this.ticking = false;
        }

        // Destroy typewriter instance
        if (this.typewriter && typeof this.typewriter.destroy === 'function') {
            this.typewriter.destroy();
        }

        // Clear cached elements
        this.elements.clear();
        this.sectionData = [];
        
        // Reset state
        this.activeSection = '';
        this.isScrollTopVisible = false;
        this.lastScrollY = 0;
    }

    /**
     * Public API for manual refresh
     */
    refresh() {
        this.updateSectionPositions();
        this.updateOnScroll();
    }
}

// Singleton pattern with lazy initialization
let portfolioInstance = null;

/**
 * Initialize portfolio controller
 */
function initPortfolio() {
    if (!portfolioInstance && document.readyState !== 'loading') {
        portfolioInstance = new PortfolioController();
        window.portfolioController = portfolioInstance; // For debugging
    }
}

/**
 * Cleanup portfolio controller
 */
function cleanupPortfolio() {
    if (portfolioInstance) {
        portfolioInstance.destroy();
        portfolioInstance = null;
        delete window.portfolioController;
    }
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });
} else {
    initPortfolio();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupPortfolio, { once: true });

// Expose for manual control
window.PortfolioController = PortfolioController;