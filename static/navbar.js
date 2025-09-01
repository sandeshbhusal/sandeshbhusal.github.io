// Dynamic navbar height CSS variable and smooth anchor scrolling
document.addEventListener('DOMContentLoaded', function() {
  const root = document.documentElement;
  const navbar = document.querySelector('.main-navbar');

  function setNavbarHeightVar() {
    if (!navbar) return;
    const h = navbar.offsetHeight || 60;
    root.style.setProperty('--navbar-height', h + 'px');
  }

  setNavbarHeightVar();
  window.addEventListener('resize', setNavbarHeightVar, { passive: true });
});

// Smooth scroll for anchor links with navbar offset
document.addEventListener('click', function(e) {
  const target = e.target.closest('a[href^="#"]');
  if (target && target.getAttribute('href') !== '#') {
    const href = target.getAttribute('href');
    const id = href.substring(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const navbar = document.querySelector('.main-navbar');
    const offset = (navbar ? navbar.offsetHeight : 60) + 20;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
});
