/**
 * =========================================================================
 * PORTFOLIO WEBSITE INTERACTIVE CONTROLLER
 * =========================================================================
 * 
 * A high-performance, optimized portfolio website controller that manages
 * typewriter effects, smooth scrolling, navigation highlighting, and 
 * scroll-to-top functionality with minimal DOM manipulation and efficient
 * event handling.
 * 
 * Key Performance Features:
 * - Efficient DOM caching using Map data structure for O(1) lookups
 * - RAF-based scroll throttling to maintain 60fps performance
 * - Precomputed section data to avoid expensive getBoundingClientRect calls
 * - Event delegation to reduce memory footprint
 * - Passive event listeners to prevent scroll blocking
 * - Debounced resize handlers to prevent layout thrashing
 * 
 * Browser Support: Modern browsers with ES6+ support
 * Dependencies: Typed.js for typewriter effect (optional)
 * 
 * @author Portfolio Developer
 * @version 2.0.0
 * @since 2024
 */

class PortfolioController {
    /**
     * Initialize the Portfolio Controller with optimized configuration
     * 
     * Sets up default configurations for typewriter effect, scroll behavior,
     * and performance optimizations. Creates internal state management for
     * efficient DOM updates and scroll handling.
     * 
     * @constructor
     */
    constructor() {
        // ====================================================================
        // CONFIGURATION OBJECTS
        // ====================================================================
        
        /**
         * Typewriter effect configuration
         * Controls the animated text display in the hero section
         */
        this.config = {
            typewriter: {
                strings: ['Full-Stack Developer', 'Application Developer', 'Problem Solver'],
                typeSpeed: 50,          // Typing speed in milliseconds per character
                backSpeed: 30,          // Backspacing speed in milliseconds per character
                backDelay: 1500,        // Delay before starting to backspace
                loop: true              // Continuously loop through strings
            },
            scroll: {
                headerOffset: 80,               // Offset for fixed header when scrolling to sections
                sectionHighlightOffset: 100,    // Offset for when sections become "active" in nav
                scrollTopThreshold: 300,        // Scroll distance before showing scroll-to-top button
                throttleDelay: 16               // Throttle delay for scroll events (~60fps)
            }
        };
        
        // ====================================================================
        // STATE MANAGEMENT PROPERTIES
        // ====================================================================
        
        /**
         * Cached DOM elements using Map for efficient O(1) lookups
         * Prevents repeated querySelector calls during runtime
         * @type {Map<string, Element|Element[]>}
         */
        this.elements = new Map();
        
        /**
         * Precomputed section data for efficient scroll calculations
         * Contains section positions and dimensions to avoid layout thrashing
         * @type {Array<{id: string, element: Element, top: number, height: number}>}
         */
        this.sectionData = [];
        
        /**
         * Last recorded scroll position for RAF-based throttling
         * @type {number}
         */
        this.lastScrollY = 0;
        
        /**
         * Animation frame request status to prevent redundant RAF calls
         * @type {boolean}
         */
        this.ticking = false;
        
        /**
         * Currently active navigation section to prevent unnecessary DOM updates
         * @type {string}
         */
        this.activeSection = '';
        
        /**
         * Scroll-to-top button visibility state to prevent redundant toggles
         * @type {boolean}
         */
        this.isScrollTopVisible = false;
        
        // Initialize the controller
        this.init();
    }

    // ========================================================================
    // INITIALIZATION METHODS
    // ========================================================================

    /**
     * Main initialization method that orchestrates all setup processes
     * 
     * Uses async/await pattern to ensure proper initialization order and
     * includes comprehensive error handling to prevent initialization failures
     * from breaking the entire application.
     * 
     * Initialization Order:
     * 1. Wait for DOM to be fully ready
     * 2. Cache all required DOM elements
     * 3. Precompute section positions for scroll optimization
     * 4. Initialize typewriter effect
     * 5. Bind all event listeners
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await this.waitForDOM();        // Ensure DOM is ready
            this.cacheElements();           // Cache DOM elements for performance
            this.precomputeSectionData();   // Calculate section positions
            this.initTypewriter();          // Set up typewriter animation
            this.bindEvents();              // Attach all event listeners
        } catch (error) {
            console.error('Portfolio initialization failed:', error);
            // Graceful degradation - basic functionality should still work
        }
    }

    /**
     * Ensures DOM is fully loaded before proceeding with initialization
     * 
     * Uses Promise-based approach to handle both scenarios:
     * - DOM still loading: Wait for DOMContentLoaded event
     * - DOM already loaded: Resolve immediately
     * 
     * @returns {Promise<void>} Resolves when DOM is ready
     */
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                // DOM still loading, wait for DOMContentLoaded
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            } else {
                // DOM already loaded, proceed immediately
                resolve();
            }
        });
    }

    /**
     * Cache frequently accessed DOM elements using Map for O(1) lookups
     * 
     * Caching strategy:
     * - Single elements: Direct querySelector result
     * - Multiple elements: Convert NodeList to Array for better performance
     * - Validation: Only cache elements that actually exist
     * 
     * This prevents expensive DOM queries during scroll events and interactions,
     * significantly improving runtime performance.
     */
    cacheElements() {
        // Define all selectors needed throughout the application
        const selectors = {
            typewriterElement: '#element',          // Target for typewriter effect
            navLinks: 'a[href^="#"]',              // All internal navigation links
            sections: 'section[id]',               // All page sections with IDs
            navItems: 'nav ul li a[href^="#"]',    // Navigation menu items specifically
            scrollTopBtn: '.scroll-top'            // Scroll-to-top button
        };

        // Cache elements efficiently
        for (const [key, selector] of Object.entries(selectors)) {
            const isMultiple = ['navLinks', 'sections', 'navItems'].includes(key);
            const elements = isMultiple 
                ? Array.from(document.querySelectorAll(selector))  // Convert to Array for performance
                : document.querySelector(selector);                // Single element
            
            // Only cache if elements exist (prevents null reference errors)
            if (elements && (!isMultiple || elements.length > 0)) {
                this.elements.set(key, elements);
            }
        }
    }

    /**
     * Precompute section positions and dimensions for efficient scroll handling
     * 
     * Performance Strategy:
     * - Calculate all section positions once during initialization
     * - Update positions only on window resize (debounced)
     * - Use cached values during scroll events to avoid layout thrashing
     * 
     * This approach eliminates expensive getBoundingClientRect() calls during
     * scroll events, which can cause significant performance issues on slower devices.
     */
    precomputeSectionData() {
        const sections = this.elements.get('sections');
        if (!sections) {
            console.warn('No sections found for navigation highlighting');
            return;
        }

        // Create section data structure with placeholders
        this.sectionData = sections.map(section => ({
            id: section.id,        // Section identifier for navigation matching
            element: section,      // DOM element reference
            top: 0,               // Top position (calculated in updateSectionPositions)
            height: 0             // Section height (calculated in updateSectionPositions)
        }));

        // Calculate initial positions
        this.updateSectionPositions();
        
        // Update positions on window resize with debouncing to prevent excessive calculations
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            // Debounce resize events to avoid performance issues during window resizing
            resizeTimeout = setTimeout(() => this.updateSectionPositions(), 150);
        }, { passive: true }); // Passive listener to improve scroll performance
    }

    /**
     * Update cached section positions after layout changes
     * 
     * Called during initialization and on window resize to keep section
     * position data accurate. Uses getBoundingClientRect() + pageYOffset
     * for accurate positioning that accounts for fixed headers and page scrolling.
     */
    updateSectionPositions() {
        this.sectionData.forEach(data => {
            const rect = data.element.getBoundingClientRect();
            // Calculate absolute position accounting for current scroll position
            data.top = rect.top + window.pageYOffset;
            data.height = rect.height;
        });
    }

    // ========================================================================
    // TYPEWRITER EFFECT INITIALIZATION
    // ========================================================================

    /**
     * Initialize the typewriter effect with comprehensive error handling
     * 
     * Features:
     * - Graceful degradation if Typed.js library is not loaded
     * - Error handling for initialization failures
     * - Proper configuration object passing
     * 
     * The typewriter effect creates an engaging animated text display in the
     * hero section, cycling through different professional titles.
     */
    initTypewriter() {
        const element = this.elements.get('typewriterElement');
        
        // Validate dependencies and target element
        if (!element) {
            console.warn('Typewriter target element not found');
            return;
        }
        
        if (typeof Typed === 'undefined') {
            console.warn('Typed.js library not loaded - typewriter effect disabled');
            return;
        }

        try {
            // Initialize Typed.js with configuration
            this.typewriter = new Typed('#element', this.config.typewriter);
        } catch (error) {
            console.error('Typewriter initialization failed:', error);
            // Application continues to function without typewriter effect
        }
    }

    // ========================================================================
    // EVENT BINDING AND MANAGEMENT
    // ========================================================================

    /**
     * Bind all event listeners using performance-optimized patterns
     * 
     * Event Binding Strategy:
     * - Event delegation where possible to reduce memory usage
     * - Passive listeners for scroll events to prevent blocking
     * - Throttling for high-frequency events like scroll
     * - Single event listeners instead of multiple handlers
     */
    bindEvents() {
        this.bindSmoothScrolling();  // Navigation link click handling
        this.bindScrollEvents();     // Scroll-based features (nav highlighting, scroll-to-top)
        this.bindScrollToTop();      // Scroll-to-top button functionality
    }

    /**
     * Use event delegation for efficient navigation link handling
     * 
     * Event Delegation Benefits:
     * - Single event listener handles all navigation links
     * - Automatically works with dynamically added links
     * - Reduced memory footprint compared to individual listeners
     * - Better performance with many navigation elements
     */
    bindSmoothScrolling() {
        document.addEventListener('click', (e) => {
            // Use closest() to handle clicks on child elements (e.g., icons within links)
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                this.handleSmoothScroll(e, link);
            }
        });
    }

    /**
     * Handle smooth scrolling to page sections with progressive enhancement
     * 
     * Progressive Enhancement Strategy:
     * 1. Modern browsers: Use native CSS scroll-behavior with ScrollToOptions
     * 2. Older browsers: Custom JavaScript animation with easing
     * 
     * @param {Event} e - The click event object
     * @param {Element} link - The clicked navigation link element
     */
    handleSmoothScroll(e, link) {
        e.preventDefault(); // Prevent default anchor link behavior
        
        const targetId = link.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (!targetElement) {
            console.warn(`Target element ${targetId} not found`);
            return;
        }

        // Calculate target position accounting for fixed header
        const targetPosition = targetElement.offsetTop - this.config.scroll.headerOffset;
        
        // Use native smooth scrolling when supported (better performance)
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: Math.max(0, targetPosition), // Prevent negative scroll positions
                behavior: 'smooth'
            });
        } else {
            // Fallback for older browsers (IE, older Safari)
            this.smoothScrollFallback(targetPosition);
        }
    }

    /**
     * Custom smooth scroll implementation for older browsers
     * 
     * Features:
     * - Eased animation using quadratic easing function
     * - RequestAnimationFrame for smooth 60fps animation
     * - Fixed duration for consistent user experience
     * - Prevents negative scroll positions
     * 
     * @param {number} targetPosition - The target scroll position in pixels
     */
    smoothScrollFallback(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500; // Fixed 500ms duration for consistency
        let startTime = null;

        /**
         * Animation frame callback for smooth scroll effect
         * @param {number} currentTime - Current timestamp from requestAnimationFrame
         */
        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1); // Clamp to [0, 1]
            
            // Quadratic easing function for natural feel: f(t) = t(2-t)
            const ease = progress * (2 - progress);
            
            // Apply eased position
            window.scrollTo(0, startPosition + (distance * ease));
            
            // Continue animation until complete
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }

    // ========================================================================
    // SCROLL EVENT OPTIMIZATION
    // ========================================================================

    /**
     * Bind scroll events with performance optimization using RAF throttling
     * 
     * Scroll Performance Strategy:
     * - Passive listeners to prevent scroll blocking
     * - RequestAnimationFrame throttling to maintain 60fps
     * - Batched DOM updates to prevent layout thrashing
     * - State caching to minimize unnecessary DOM manipulations
     */
    bindScrollEvents() {
        window.addEventListener('scroll', () => {
            // Cache scroll position to avoid multiple pageYOffset calls
            this.lastScrollY = window.pageYOffset;
            this.requestTick(); // Request throttled update
        }, { passive: true }); // Passive listener for better scroll performance
    }

    /**
     * Request animation frame for throttled scroll updates
     * 
     * RAF Throttling Benefits:
     * - Limits updates to monitor refresh rate (typically 60fps)
     * - Prevents excessive DOM manipulation during fast scrolling
     * - Ensures smooth animations and interactions
     * - Reduces CPU usage and improves battery life on mobile devices
     */
    requestTick() {
        if (!this.ticking) {
            requestAnimationFrame(() => this.updateOnScroll());
            this.ticking = true;
        }
    }

    /**
     * Batched scroll update handler for optimal performance
     * 
     * Batching Strategy:
     * - Group all scroll-related updates into single RAF callback
     * - Update navigation highlighting and scroll-to-top button together
     * - Reset ticking flag to allow next RAF request
     * 
     * This approach minimizes layout recalculation and repainting.
     */
    updateOnScroll() {
        this.updateActiveNavigation();  // Update active nav item highlighting
        this.updateScrollTopButton();   // Toggle scroll-to-top button visibility
        this.ticking = false;          // Allow next RAF request
    }

    /**
     * Efficiently determine and update active navigation section
     * 
     * Algorithm:
     * 1. Use precomputed section data to avoid expensive DOM queries
     * 2. Find section that contains current scroll position
     * 3. Only update DOM if active section has changed
     * 
     * Performance Optimizations:
     * - Uses cached section positions instead of getBoundingClientRect()
     * - Early exit if no section change detected
     * - Minimal DOM manipulation through state comparison
     */
    updateActiveNavigation() {
        const scrollPosition = this.lastScrollY;
        const offset = this.config.scroll.sectionHighlightOffset;
        let newActiveSection = '';

        // Iterate through precomputed section data for efficient lookup
        for (const section of this.sectionData) {
            // Check if scroll position is within section bounds
            if (scrollPosition >= section.top - offset &&
                scrollPosition < section.top + section.height - offset) {
                newActiveSection = section.id;
                break; // Found active section, exit early
            }
        }

        // Only update DOM if active section changed (prevents unnecessary DOM manipulation)
        if (newActiveSection !== this.activeSection) {
            this.activeSection = newActiveSection;
            this.updateNavigationHighlight();
        }
    }

    /**
     * Update navigation menu highlighting with minimal DOM manipulation
     * 
     * Optimization Strategy:
     * - Single pass through navigation items
     * - Use classList.toggle() for atomic class updates
     * - Avoid removing/adding classes separately to minimize reflow
     */
    updateNavigationHighlight() {
        const navItems = this.elements.get('navItems');
        if (!navItems) {
            console.warn('Navigation items not found for highlighting');
            return;
        }

        const targetHref = `#${this.activeSection}`;
        
        // Update all navigation items in single pass
        navItems.forEach(item => {
            const isActive = item.getAttribute('href') === targetHref;
            item.classList.toggle('active', isActive); // Atomic class toggle
        });
    }

    /**
     * Efficiently toggle scroll-to-top button visibility
     * 
     * State Management:
     * - Track current visibility state to prevent redundant DOM updates
     * - Only modify DOM when visibility state actually changes
     * - Use single classList.toggle() call for atomic updates
     */
    updateScrollTopButton() {
        const shouldShow = this.lastScrollY > this.config.scroll.scrollTopThreshold;
        
        // Only update DOM if visibility state changed
        if (shouldShow !== this.isScrollTopVisible) {
            this.isScrollTopVisible = shouldShow;
            const btn = this.elements.get('scrollTopBtn');
            
            if (btn) {
                btn.classList.toggle('active', shouldShow);
            } else {
                console.warn('Scroll-to-top button not found');
            }
        }
    }

    // ========================================================================
    // SCROLL-TO-TOP FUNCTIONALITY
    // ========================================================================

    /**
     * Bind scroll-to-top button with single optimized event listener
     * 
     * Event Handling:
     * - Single click listener instead of multiple handlers
     * - Event delegation not needed since there's only one button
     * - Prevents default behavior to avoid any anchor link conflicts
     */
    bindScrollToTop() {
        const btn = this.elements.get('scrollTopBtn');
        if (!btn) {
            console.warn('Scroll-to-top button not found');
            return;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToTop();
        });
    }

    /**
     * Scroll to top of page with progressive enhancement
     * 
     * Uses same progressive enhancement strategy as section scrolling:
     * - Modern browsers: Native smooth scrolling
     * - Older browsers: Custom JavaScript animation
     */
    scrollToTop() {
        if ('scrollBehavior' in document.documentElement.style) {
            // Modern browsers with native smooth scrolling support
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Fallback for older browsers
            this.smoothScrollFallback(0);
        }
    }

    // ========================================================================
    // CLEANUP AND RESOURCE MANAGEMENT
    // ========================================================================

    /**
     * Comprehensive cleanup method for proper resource management
     * 
     * Cleanup Strategy:
     * - Cancel pending animation frames to prevent memory leaks
     * - Destroy external library instances (Typed.js)
     * - Clear cached data structures
     * - Reset internal state
     * 
     * This prevents memory leaks in single-page applications and ensures
     * clean teardown when the controller is no longer needed.
     */
    destroy() {
        // Cancel any pending animation frame requests
        if (this.ticking) {
            this.ticking = false;
        }

        // Properly destroy typewriter instance to prevent memory leaks
        if (this.typewriter && typeof this.typewriter.destroy === 'function') {
            this.typewriter.destroy();
        }

        // Clear all cached DOM references
        this.elements.clear();
        this.sectionData = [];
        
        // Reset internal state to initial values
        this.activeSection = '';
        this.isScrollTopVisible = false;
        this.lastScrollY = 0;
        
        console.log('Portfolio controller destroyed and cleaned up');
    }

    /**
     * Public API method for manual refresh after dynamic content changes
     * 
     * Use Cases:
     * - After dynamic content insertion that changes section positions
     * - After layout changes that affect section dimensions
     * - After programmatic DOM modifications
     * 
     * This provides a way to update the controller state without full reinitialization.
     */
    refresh() {
        this.updateSectionPositions(); // Recalculate section positions
        this.updateOnScroll();         // Update current scroll-based states
        console.log('Portfolio controller refreshed');
    }
}

// ============================================================================
// GLOBAL INITIALIZATION AND LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Singleton instance holder for the portfolio controller
 * Prevents multiple instances and provides global access point
 * @type {PortfolioController|null}
 */
let portfolioInstance = null;

/**
 * Initialize the portfolio controller using singleton pattern
 * 
 * Singleton Benefits:
 * - Ensures only one controller instance exists
 * - Provides global access point for debugging and manual control
 * - Prevents duplicate event listeners and resource usage
 * 
 * Only initializes if DOM is ready and no instance exists yet.
 */
function initPortfolio() {
    if (!portfolioInstance && document.readyState !== 'loading') {
        portfolioInstance = new PortfolioController();
        
        // Expose to global scope for debugging and manual control
        window.portfolioController = portfolioInstance;
        
        console.log('Portfolio controller initialized successfully');
    }
}

/**
 * Clean up the portfolio controller and remove global references
 * 
 * Cleanup Process:
 * - Call controller's destroy method for proper resource cleanup
 * - Remove global window reference
 * - Reset singleton instance to null
 * 
 * Called automatically on page unload to prevent memory leaks.
 */
function cleanupPortfolio() {
    if (portfolioInstance) {
        portfolioInstance.destroy();
        portfolioInstance = null;
        delete window.portfolioController;
        
        console.log('Portfolio controller cleaned up on page unload');
    }
}

// ============================================================================
// AUTOMATIC INITIALIZATION AND CLEANUP
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    // DOM still loading, wait for DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });
} else {
    // DOM already loaded, initialize immediately
    initPortfolio();
}

// Automatic cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', cleanupPortfolio, { once: true });

// ============================================================================
// PUBLIC API EXPOSURE
// ============================================================================

/**
 * Expose PortfolioController class globally for manual instantiation
 * 
 * This allows advanced users to create custom instances with different
 * configurations or for testing purposes while maintaining the default
 * singleton behavior for normal usage.
 */
window.PortfolioController = PortfolioController;


  const menuToggle = document.querySelector('.menu-toggle');
  const navRight = document.querySelector('.right');

  menuToggle.addEventListener('click', () => {
    navRight.classList.toggle('show');
  });

