// Initialize Typed.js for animated text effect
// Creates a typewriter animation that cycles through different role titles
var typed = new Typed('#element', {
    strings: ['Full-Stack Developer', 'Application Developer', 'Problem Solver'], // Array of strings to type
    typeSpeed: 50,      // Speed of typing in milliseconds per character
    backSpeed: 30,      // Speed of backspacing in milliseconds per character
    loop: true,         // Keep looping through the strings infinitely
    backDelay: 1500     // Delay before starting to backspace (in milliseconds)
});

// Smooth scrolling functionality for navigation links
// Applies to all anchor tags that have href starting with "#" (internal page links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default jump-to-section behavior
        
        // Get the target section ID from the href attribute
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        // If target element exists, scroll to it smoothly
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Offset by 80px to account for fixed header
                behavior: 'smooth' // Enable smooth scrolling animation
            });
        }
    });
});

// Navigation highlight and scroll-to-top button functionality
// Runs on every scroll event to update active navigation states
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section'); // Get all page sections
    const navItems = document.querySelectorAll('nav ul li a'); // Get all navigation links
    
    let current = ''; // Variable to store currently active section ID
    
    // Loop through each section to determine which one is currently in view
    sections.forEach(section => {
        const sectionTop = section.offsetTop;    // Distance from top of page to section
        const sectionHeight = section.clientHeight; // Height of the section
        
        // Check if current scroll position is within this section
        // 100px offset ensures section is highlighted slightly before it's fully in view
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id'); // Set this section as current
        }
    });
    
    // Update navigation link highlighting
    navItems.forEach(item => {
        item.classList.remove('active'); // Remove active class from all nav items
        // Add active class to nav item that corresponds to current section
        if (item.getAttribute('href') === `#${current}`) {
            item.classList.add('active');
        }
    });
    
    // Show/hide scroll-to-top button based on scroll position
    const scrollTopBtn = document.querySelector('.scroll-top');
    if (scrollTopBtn) {
        // Show button when user has scrolled down 300px or more
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            scrollTopBtn.classList.add('active');
        } else {
            scrollTopBtn.classList.remove('active');
        }
    }
});

// Scroll to top button click handler
// Smoothly scrolls the page back to the top when button is clicked
document.querySelector('.scroll-top').addEventListener('click', function() {
    window.scrollTo({
        top: 0,             // Scroll to very top of page
        behavior: 'smooth'  // Use smooth scrolling animation
    });
});