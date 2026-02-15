/**
 * =========================================================================
 * PORTFOLIO WEBSITE INTERACTIVE CONTROLLER
 * =========================================================================
 * 
 * Enhanced portfolio website controller for Mansi Saini's portfolio
 */

class PortfolioController {
    constructor() {
        this.config = {
            typewriter: {
                strings: [
                    'Full-Stack Developer', 
                    'Enterprise Application Developer', 
                    'Freelance Web Developer',
                    'AI Integration Specialist',
                    'Problem Solver'
                ],
                typeSpeed: 50,
                backSpeed: 30,
                backDelay: 1500,
                loop: true
            },
            scroll: {
                headerOffset: 80,
                sectionHighlightOffset: 100,
                scrollTopThreshold: 300,
                throttleDelay: 16
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

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            } else {
                resolve();
            }
        });
    }

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

    precomputeSectionData() {
        const sections = this.elements.get('sections');
        if (!sections) {
            console.warn('No sections found for navigation highlighting');
            return;
        }

        this.sectionData = sections.map(section => ({
            id: section.id,
            element: section,
            top: 0,
            height: 0
        }));

        this.updateSectionPositions();
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateSectionPositions(), 150);
        }, { passive: true });
    }

    updateSectionPositions() {
        this.sectionData.forEach(data => {
            const rect = data.element.getBoundingClientRect();
            data.top = rect.top + window.pageYOffset;
            data.height = rect.height;
        });
    }

    initTypewriter() {
        const element = this.elements.get('typewriterElement');
        
        if (!element) {
            console.warn('Typewriter target element not found');
            return;
        }
        
        if (typeof Typed === 'undefined') {
            console.warn('Typed.js library not loaded - typewriter effect disabled');
            return;
        }

        try {
            this.typewriter = new Typed('#element', this.config.typewriter);
        } catch (error) {
            console.error('Typewriter initialization failed:', error);
        }
    }

    bindEvents() {
        this.bindSmoothScrolling();
        this.bindScrollEvents();
        this.bindScrollToTop();
    }

    bindSmoothScrolling() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                this.handleSmoothScroll(e, link);
            }
        });
    }

    handleSmoothScroll(e, link) {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (!targetElement) {
            console.warn(`Target element ${targetId} not found`);
            return;
        }

        const targetPosition = targetElement.offsetTop - this.config.scroll.headerOffset;
        
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        } else {
            this.smoothScrollFallback(targetPosition);
        }
    }

    smoothScrollFallback(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500;
        let startTime = null;

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = progress * (2 - progress);
            
            window.scrollTo(0, startPosition + (distance * ease));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }

    bindScrollEvents() {
        window.addEventListener('scroll', () => {
            this.lastScrollY = window.pageYOffset;
            this.requestTick();
        }, { passive: true });
    }

    requestTick() {
        if (!this.ticking) {
            requestAnimationFrame(() => this.updateOnScroll());
            this.ticking = true;
        }
    }

    updateOnScroll() {
        this.updateActiveNavigation();
        this.updateScrollTopButton();
        this.ticking = false;
    }

    updateActiveNavigation() {
        const scrollPosition = this.lastScrollY;
        const offset = this.config.scroll.sectionHighlightOffset;
        let newActiveSection = '';

        for (const section of this.sectionData) {
            if (scrollPosition >= section.top - offset &&
                scrollPosition < section.top + section.height - offset) {
                newActiveSection = section.id;
                break;
            }
        }

        if (newActiveSection !== this.activeSection) {
            this.activeSection = newActiveSection;
            this.updateNavigationHighlight();
        }
    }

    updateNavigationHighlight() {
        const navItems = this.elements.get('navItems');
        if (!navItems) {
            console.warn('Navigation items not found for highlighting');
            return;
        }

        const targetHref = `#${this.activeSection}`;
        
        navItems.forEach(item => {
            const isActive = item.getAttribute('href') === targetHref;
            item.classList.toggle('active', isActive);
        });
    }

    updateScrollTopButton() {
        const shouldShow = this.lastScrollY > this.config.scroll.scrollTopThreshold;
        
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

    scrollToTop() {
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            this.smoothScrollFallback(0);
        }
    }

    destroy() {
        if (this.ticking) {
            this.ticking = false;
        }

        if (this.typewriter && typeof this.typewriter.destroy === 'function') {
            this.typewriter.destroy();
        }

        this.elements.clear();
        this.sectionData = [];
        this.activeSection = '';
        this.isScrollTopVisible = false;
        this.lastScrollY = 0;
        
        console.log('Portfolio controller destroyed and cleaned up');
    }

    refresh() {
        this.updateSectionPositions();
        this.updateOnScroll();
        console.log('Portfolio controller refreshed');
    }
}

// Global initialization
let portfolioInstance = null;

function initPortfolio() {
    if (!portfolioInstance && document.readyState !== 'loading') {
        portfolioInstance = new PortfolioController();
        window.portfolioController = portfolioInstance;
        console.log('Portfolio controller initialized successfully');
    }
}

function cleanupPortfolio() {
    if (portfolioInstance) {
        portfolioInstance.destroy();
        portfolioInstance = null;
        delete window.portfolioController;
        console.log('Portfolio controller cleaned up on page unload');
    }
}

// Auto initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });
} else {
    initPortfolio();
}

window.addEventListener('beforeunload', cleanupPortfolio, { once: true });
window.PortfolioController = PortfolioController;

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navRight = document.querySelector('.right');

if (menuToggle && navRight) {
    menuToggle.addEventListener('click', () => {
        navRight.classList.toggle('show');
    });
}