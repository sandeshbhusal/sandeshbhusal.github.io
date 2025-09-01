// Table of Contents scroll highlighting
function initTocHighlighting() {
  const tocLinks = document.querySelectorAll('aside nav a');
  const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  
  if (tocLinks.length === 0 || headings.length === 0) return;
  
  let currentActive = null;
  
  function highlightTocItem(id) {
    // Remove active class from all links
    tocLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to the matching link
    const activeLink = document.querySelector(`aside nav a[href="#${id}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      currentActive = activeLink;
    }
  }
  
  function getNavbarOffset() {
    const root = document.documentElement;
    const varVal = getComputedStyle(root).getPropertyValue('--navbar-height').trim();
    const px = parseInt(varVal || '60', 10);
    return isNaN(px) ? 60 : px;
  }

  function updateTocOnScroll() {
    const navbarHeight = getNavbarOffset();
    const extraOffset = 80; // Extra offset to ensure ToC doesn't get hidden
    const scrollPosition = window.scrollY + navbarHeight + extraOffset; // Account for navbar + generous offset
    let activeHeading = null;
    
    // Find the current heading - look for the heading that's currently visible
    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i];
      
      if (heading.offsetTop <= scrollPosition) {
        activeHeading = heading;
        break;
      }
    }
    
    // If no heading is found above scroll position, use the first one
    if (!activeHeading && headings.length > 0) {
      activeHeading = headings[0];
    }
    
    if (activeHeading && activeHeading.id) {
      highlightTocItem(activeHeading.id);
    }
  }
  
  // Debounce scroll events for better performance
  let scrollTimeout;
  function debouncedScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateTocOnScroll, 10);
  }
  
  // Initial highlight
  updateTocOnScroll();
  
  // Update on scroll
  window.addEventListener('scroll', debouncedScroll, { passive: true });
  
  // Update on resize
  window.addEventListener('resize', updateTocOnScroll, { passive: true });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initTocHighlighting);
