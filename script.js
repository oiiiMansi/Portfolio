/**
 * Portfolio Website Interactive Features
 * Handles typewriter animation, smooth scrolling, navigation highlighting, and scroll-to-top functionality
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
                scrollTopThreshold: 300
            }
        };
        
        this.elements = {};
        this.throttleTimer = null;
        
        this.init();
    }

    /**
     * Initialize all portfolio features
     */
    init() {
        this.cacheElements();
        this.initTypewriter();
        this.bindEvents();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            typewriterElement: document.getElementById('element'),
            navLinks: document.querySelectorAll('a[href^="#"]'),
            sections: document.querySelectorAll('section'),
            navItems: document.querySelectorAll('nav ul li a'),
            scrollTopBtn: document.querySelector('.scroll-top')
        };
    }

    /**
     * Initialize typewriter animation
     */
    initTypewriter() {
        if (!this.elements.typewriterElement) {
            console.warn('Typewriter element not found');
            return;
        }

        try {
            new Typed('#element', this.config.typewriter);
        } catch (error) {
            console.error('Failed to initialize typewriter:', error);
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        this.bindSmoothScrolling();
        this.bindScrollEvents();
        this.bindScrollToTop();
    }

    /**
     * Add smooth scrolling to navigation links
     */
    bindSmoothScrolling() {
        this.elements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', this.handleSmoothScroll.bind(this));
        });
    }

    /**
     * Handle smooth scroll navigation
     * @param {Event} e - Click event
     */
    handleSmoothScroll(e) {
        e.preventDefault();
        
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (!targetElement) {
            console.warn(`Target element ${targetId} not found`);
            return;
        }

        const targetPosition = targetElement.offsetTop - this.config.scroll.headerOffset;
        
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });
    }

    /**
     * Bind scroll-related event listeners with throttling
     */
    bindScrollEvents() {
        window.addEventListener('scroll', this.throttleScroll.bind(this), { passive: true });
    }

    /**
     * Throttle scroll events for better performance
     */
    throttleScroll() {
        if (this.throttleTimer) return;
        
        this.throttleTimer = requestAnimationFrame(() => {
            this.handleScroll();
            this.throttleTimer = null;
        });
    }

    /**
     * Handle scroll events for navigation highlighting and scroll-to-top button
     */
    handleScroll() {
        this.updateActiveNavigation();
        this.updateScrollTopButton();
    }

    /**
     * Update active navigation item based on current scroll position
     */
    updateActiveNavigation() {
        const scrollPosition = window.pageYOffset;
        let activeSection = '';

        // Find the currently active section
        this.elements.sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPosition >= sectionTop - this.config.scroll.sectionHighlightOffset &&
                scrollPosition < sectionTop + sectionHeight - this.config.scroll.sectionHighlightOffset) {
                activeSection = section.getAttribute('id');
            }
        });

        // Update navigation highlighting
        this.elements.navItems.forEach(item => {
            const isActive = item.getAttribute('href') === `#${activeSection}`;
            item.classList.toggle('active', isActive);
        });
    }

    //Show/hide scroll-to-top button based on scroll position
    updateScrollTopButton() {
        if (!this.elements.scrollTopBtn) return;

        const scrollPosition = Math.max(
            document.body.scrollTop,
            document.documentElement.scrollTop
        );

        const shouldShow = scrollPosition > this.config.scroll.scrollTopThreshold;
        this.elements.scrollTopBtn.classList.toggle('active', shouldShow);
    }

    /**
     * Bind scroll-to-top button functionality
     */
    bindScrollToTop() {
        if (!this.elements.scrollTopBtn) {
            console.warn('Scroll-to-top button not found');
            return;
        }

        this.elements.scrollTopBtn.addEventListener('click', this.scrollToTop.bind(this));
    }

    /**
     * Scroll to top of page smoothly
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        if (this.throttleTimer) {
            cancelAnimationFrame(this.throttleTimer);
        }
        
        // Remove event listeners
        this.elements.navLinks.forEach(anchor => {
            anchor.removeEventListener('click', this.handleSmoothScroll);
        });
        
        window.removeEventListener('scroll', this.throttleScroll);
        
        if (this.elements.scrollTopBtn) {
            this.elements.scrollTopBtn.removeEventListener('click', this.scrollToTop);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioController = new PortfolioController();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.portfolioController) {
        window.portfolioController.destroy();
    }
});