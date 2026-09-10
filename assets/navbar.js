(function () {
  'use strict';

  var _initialized = false;

  function initNavbar() {
    if (_initialized) return;
    _initialized = true;

    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    if (!nav) return;

    var drops = nav.querySelectorAll('.nl .has-drop');

    function closeDrops(except) {
      drops.forEach(function (li) {
        if (li !== except) li.classList.remove('open');
      });
    }

    // Desktop dropdowns — toggle on click, stop propagation so outside-click
    // handler doesn't immediately close the one we just opened.
    drops.forEach(function (li) {
      var link = li.querySelector(':scope > a');
      if (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var willOpen = !li.classList.contains('open');
          closeDrops(li);
          li.classList.toggle('open', willOpen);
        });
      }
    });

    // Outside-click: close dropdowns and mobile nav.
    // Guard against the toggle button so the same click that opens the menu
    // doesn't bubble up here and immediately close it.
    document.addEventListener('click', function (e) {
      var inDrop = e.target.closest('.has-drop');
      var inToggle = toggle && e.target.closest('#navToggle');
      if (!inDrop) closeDrops(null);
      if (!inToggle) {
        nav.classList.remove('nav-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Mobile hamburger toggle — stopPropagation prevents the document click
    // handler above from running on the same event and immediately closing it.
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = nav.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) closeDrops(null);
      });
    }

    // Non-dropdown nav links: close mobile menu when tapped.
    nav.querySelectorAll('.nl a').forEach(function (a) {
      if (a.parentElement && a.parentElement.classList.contains('has-drop')) return;
      a.addEventListener('click', function () {
        nav.classList.remove('nav-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        closeDrops(null);
      });
    });

    // Scroll-to-dark behaviour.
    window.addEventListener('scroll', function () {
      var navLogo = document.getElementById('navLogo');
      var s = window.scrollY;
      nav.classList.toggle('dark', s > 80);
      if (navLogo) {
        navLogo.src = s > 80
          ? '/logo/TDS Logo Set/Tech DataSeeders Logo white.png'
          : '/logo/Tech DataSeeders Logo.png';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
})();