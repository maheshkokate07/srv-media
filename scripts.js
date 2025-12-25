(function () {
  'use strict';

  /**
   * Debounce function to limit function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  
  function debounce(func, wait) {
    var timeout;
    return function executedFunction() {
      var context = this;
      var args = arguments;
      var later = function () {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean}
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Update the persistent live region (minimal for accessibility)
   * @param {string} message
   */
  function updateLiveRegion(message) {
    var sr = document.getElementById('sr-status');
    if (sr) sr.textContent = message;
  }

  // ==========================================================================
  // Header Scroll Effect
  // ==========================================================================

  function initHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;

    var handleScroll = debounce(function () {
      if (window.scrollY > 50) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }
    }, 10);

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // ==========================================================================
  // Hero Slider
  // ==========================================================================

  function initHeroSlider() {
    var slider = document.getElementById('heroSlider');
    if (!slider) return;

    // Only keep vertical CSS-driven columns. JS only manages pause/resume for accessibility.
    var tracks = slider.querySelectorAll('.hero__track');

    // Ensure each column has duplicated slides and a smooth duration for seamless infinite scrolling
    tracks.forEach(function (track) {
      var originals = Array.prototype.slice.call(track.children);
      var n = originals.length;

      // Wait for images inside track to load to compute sizes accurately
      var imgs = track.querySelectorAll('img');
      var imgPromises = Array.prototype.slice.call(imgs).map(function (img) {
        return img.complete ? Promise.resolve() : new Promise(function (res) { img.addEventListener('load', res, { once: true }); });
      });

      Promise.all(imgPromises).then(function () {
        // Recalculate originals (in case DOM changed)
        originals = Array.prototype.slice.call(track.children, 0, n);

        // Check if already duplicated (original set followed by identical set)
        var isDuplicated = false;
        if (n > 1 && track.children.length >= n * 2) {
          isDuplicated = true;
          for (var i = 0; i < n; i++) {
            if (!track.children[i].isEqualNode(track.children[i + n])) {
              isDuplicated = false;
              break;
            }
          }
        }

        if (!isDuplicated) {
          for (var j = 0; j < n; j++) {
            track.appendChild(originals[j].cloneNode(true));
          }
        }

        // Prevent slides from shrinking to keep layout stable
        Array.prototype.forEach.call(track.children, function (c) { c.style.flexShrink = '0'; });

        // Compute total height for the original sequence (including gaps)
        var gapPx = parseFloat(getComputedStyle(track).gap) || 16;
        var totalHeight = 0;
        for (var k = 0; k < n; k++) {
          totalHeight += originals[k].offsetHeight;
        }
        totalHeight += gapPx * Math.max(0, n - 1);

        // Determine a duration so the scroll speed is consistent (pixels/second)
        var speedPxPerSec = 60; // adjust for desired speed
        var duration = Math.max(6, totalHeight / speedPxPerSec);

        var column = track.closest('.hero__column');
        // Decide direction: left and right columns scroll upward, center scrolls downward
        var isUp = column && (column.classList.contains('hero__column--left') || column.classList.contains('hero__column--right'));

        if (!prefersReducedMotion()) {
          // Build a unique keyframe rule so animation scrolls by exact pixel values (prevents jump)
          var animName = 'hero-scroll-' + (isUp ? 'up' : 'down') + '-' + Math.random().toString(36).substr(2, 6);
          var keyframes = '';

          if (isUp) {
            keyframes = '@keyframes ' + animName + ' { 0% { transform: translateY(0px); } 100% { transform: translateY(-' + totalHeight + 'px); } }';
          } else {
            // Start from -totalHeight to 0 so downward motion is seamless
            keyframes = '@keyframes ' + animName + ' { 0% { transform: translateY(-' + totalHeight + 'px); } 100% { transform: translateY(0px); } }';
            // set initial transform so layout matches start of animation
            track.style.transform = 'translateY(-' + totalHeight + 'px)';
          }

          var styleTag = document.createElement('style');
          styleTag.type = 'text/css';
          styleTag.textContent = keyframes;
          document.head.appendChild(styleTag);

          track.style.willChange = 'transform';
          track.style.animation = animName + ' ' + duration + 's linear infinite';
        } else {
          track.style.animation = 'none';
        }
      });
    });

    function pauseColumnAnimations() {
      tracks.forEach(function (t) { t.classList.add('paused'); });
    }

    function resumeColumnAnimations() {
      if (!prefersReducedMotion()) {
        tracks.forEach(function (t) { t.classList.remove('paused'); });
      }
    }

    slider.addEventListener('mouseenter', pauseColumnAnimations);
    slider.addEventListener('mouseleave', resumeColumnAnimations);
    slider.addEventListener('focusin', pauseColumnAnimations);
    slider.addEventListener('focusout', resumeColumnAnimations);

    // Ensure tracks start paused if user prefers reduced motion
    if (prefersReducedMotion()) {
      tracks.forEach(function (t) { t.classList.add('paused'); });
    }
  }

  // ==========================================================================
  // Schools Logo Slider (Pause on hover/focus)
  // ==========================================================================

  function initSchoolsSlider() {
    var sliders = document.querySelectorAll('.schools__slider');

    sliders.forEach(function (slider) {
      var track = slider.querySelector('.schools__track');
      if (!track) return;

      // Pause animation on hover
      slider.addEventListener('mouseenter', function () {
        track.style.animationPlayState = 'paused';
      });

      slider.addEventListener('mouseleave', function () {
        if (!prefersReducedMotion()) {
          track.style.animationPlayState = 'running';
        }
      });

      // Pause on focus for keyboard users
      var logos = slider.querySelectorAll('.schools__logo');
      logos.forEach(function (logo) {
        logo.setAttribute('tabindex', '0');

        logo.addEventListener('focus', function () {
          track.style.animationPlayState = 'paused';
        });

        logo.addEventListener('blur', function () {
          if (!prefersReducedMotion()) {
            track.style.animationPlayState = 'running';
          }
        });
      });

      // Disable animation if reduced motion preferred
      if (prefersReducedMotion()) {
        track.style.animationPlayState = 'paused';
      }
    });
  }

  // ==========================================================================
  // Choose School Slider (Mobile)
  // ==========================================================================

  function initChooseSlider() {
    var slider = document.getElementById('chooseSlider');
    if (!slider) return;

    var cards = slider.querySelector('.choose__cards');
    var dots = slider.querySelectorAll('.choose__dot');
    var cardElements = slider.querySelectorAll('.choose__card');
    var currentIndex = 0;
    var isMobile = window.innerWidth < 1024;

    function updateDots() {
      dots.forEach(function (dot, index) {
        var isActive = index === currentIndex;
        dot.classList.toggle('choose__dot--active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    function goToSlide(index) {
      if (!isMobile) return;

      currentIndex = index;
      var scrollAmount = cardElements[index].offsetLeft - cards.offsetLeft;
      cards.scrollTo({
        left: scrollAmount,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
      updateDots();
        updateLiveRegion('Showing school type ' + (index + 1) + ' of ' + cardElements.length);
    }

    // Dot click handlers
    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        goToSlide(index);
      });

      dot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToSlide(index);
        }
      });
    });

    // Swipe support for mobile
    var touchStartX = 0;
    var touchEndX = 0;

    cards.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    cards.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      var threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentIndex < cardElements.length - 1) {
          goToSlide(currentIndex + 1);
        } else if (diff < 0 && currentIndex > 0) {
          goToSlide(currentIndex - 1);
        }
      }
    }, { passive: true });

    // Update mobile state on resize
    window.addEventListener('resize', debounce(function () {
      isMobile = window.innerWidth < 1024;
    }, 200));
  }

  // ==========================================================================
  // Exhibition Slider
  // ==========================================================================

  function initExhibitionSlider() {
    var slider = document.getElementById('exhibitionSlider');
    var prevBtn = document.getElementById('exhibitionPrev');
    var nextBtn = document.getElementById('exhibitionNext');

    if (!slider || !prevBtn || !nextBtn) return;

    var container = slider; // scroll container
    var track = slider.querySelector('.exhibition__cards');
    if (!track) return;

    var isPaused = false;
    var autoPlayInterval = null;
    var cardWidth = 0;
    var originalTotalWidth = 0;

    function getGap() {
      var g = getComputedStyle(track).gap;
      return g ? parseFloat(g) : 24;
    }

    function refreshMeasurements() {
      // original (non-clone) cards
      var originals = Array.from(track.querySelectorAll('.exhibition__card:not(.clone)'));
      if (originals.length === 0) return;

      var gap = getGap();
      // compute total width of one original set
      originalTotalWidth = originals.reduce(function (sum, el) { return sum + el.offsetWidth; }, 0) + gap * Math.max(0, originals.length - 1);

      // card width (approx) used for arithmetic fallbacks
      cardWidth = originals[0].offsetWidth + gap;
    }

    function ensureClones() {
      // create clones of the whole set before and after for seamless loop
      if (track.dataset.cloned === 'true') return;
      var originals = Array.from(track.querySelectorAll('.exhibition__card'));
      // prepend clones
      for (var i = originals.length - 1; i >= 0; i--) {
        var before = originals[i].cloneNode(true);
        before.classList.add('clone');
        track.insertBefore(before, track.firstChild);
      }
      // append clones
      originals.forEach(function (el) {
        var after = el.cloneNode(true);
        after.classList.add('clone');
        track.appendChild(after);
      });
      track.dataset.cloned = 'true';
    }

    ensureClones();
    // measurements after clones inserted
    refreshMeasurements();

    // start positioned at the first original card (after prepended clones)
    requestAnimationFrame(function () {
      var firstOriginal = track.querySelector('.exhibition__card:not(.clone)');
      if (firstOriginal) container.scrollLeft = Math.max(0, firstOriginal.offsetLeft);
    });

    // wrap correction to keep scroll in the middle original set
    function handleWrap() {
      if (!originalTotalWidth) return;
      // If we've scrolled into the appended clones after the second set
      if (container.scrollLeft >= originalTotalWidth * 2 - 1) {
        container.scrollLeft = container.scrollLeft - originalTotalWidth;
      }
      // If we've scrolled into the prepended clones before the first set
      if (container.scrollLeft <= 1) {
        container.scrollLeft = container.scrollLeft + originalTotalWidth;
      }
    }

    // debounced to avoid too many adjustments during smooth scroll
    container.addEventListener('scroll', debounce(handleWrap, 50));

    function scrollNext() {
      console.log('scrollNext invoked', {left: container.scrollLeft});
      var cards = Array.from(track.querySelectorAll('.exhibition__card'));
      if (!cards.length) return;

      var current = container.scrollLeft;

      // Find the first visible card index (center-based) to pick the next one
      var firstVisibleIndex = 0;
      for (var i = 0; i < cards.length; i++) {
        var el = cards[i];
        // consider card visible if its center is at or after current
        var center = el.offsetLeft + (el.offsetWidth / 2);
        if (center >= current + 1) {
          firstVisibleIndex = i;
          break;
        }
      }

      var targetIndex = Math.min(firstVisibleIndex + 1, cards.length - 1);
      var target = cards[targetIndex];

      if (target && typeof target.offsetLeft !== 'undefined') {
        container.scrollTo({ left: target.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        // fallback: advance by a reasonable width
        var fallback = Math.max(cardWidth, Math.round(container.clientWidth / 4));
        container.scrollTo({ left: container.scrollLeft + fallback, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }

      // If the scroll didn't move (edge case), force a larger scroll to ensure forward motion
      setTimeout(function () {
        var after = Math.round(container.scrollLeft);
        if (Math.abs(after - Math.round(current)) < 2) {
          var fallback2 = Math.max(cardWidth, Math.round(container.clientWidth * 0.8));
          container.scrollTo({ left: Math.min(container.scrollLeft + fallback2, container.scrollWidth - container.clientWidth), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      }, 260);

      updateLiveRegion('Scrolled to next exhibition highlight');
    }

    function scrollPrev() {
      console.log('scrollPrev invoked', {left: container.scrollLeft});
      var cards = Array.from(track.querySelectorAll('.exhibition__card'));
      if (!cards.length) return;

      var current = container.scrollLeft;

      // Find the first visible card index (center-based) then step back one
      var firstVisibleIndex = 0;
      for (var i = 0; i < cards.length; i++) {
        var el = cards[i];
        var center = el.offsetLeft + (el.offsetWidth / 2);
        if (center >= current + 1) {
          firstVisibleIndex = i;
          break;
        }
      }

      var targetIndex = Math.max(firstVisibleIndex - 1, 0);
      var target = cards[targetIndex];

      if (target && typeof target.offsetLeft !== 'undefined') {
        var maxScroll = container.scrollWidth - container.clientWidth;
        var targetLeft = Math.min(target.offsetLeft, maxScroll);
        container.scrollTo({ left: targetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        var fallback = Math.max(cardWidth, Math.round(container.clientWidth / 4));
        container.scrollTo({ left: Math.max(0, container.scrollLeft - fallback), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }

      // fallback check
      setTimeout(function () {
        var after = Math.round(container.scrollLeft);
        if (Math.abs(after - Math.round(current)) < 2) {
          var fallback2 = Math.max(cardWidth, Math.round(container.clientWidth * 0.8));
          container.scrollTo({ left: Math.max(0, container.scrollLeft - fallback2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      }, 260);

      updateLiveRegion('Scrolled to previous exhibition highlight');
    }

    function startAutoPlay() {
      if (prefersReducedMotion()) return;

      var originals = track.querySelectorAll('.exhibition__card:not(.clone)');
      if (originals.length <= 1) return;

      if (autoPlayInterval) clearInterval(autoPlayInterval);
      autoPlayInterval = setInterval(function () {
        if (!isPaused) scrollNext();
      }, 4000);
    }

    function pauseAutoPlay() { isPaused = true; }
    function resumeAutoPlay() { isPaused = false; }

    nextBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); console.log('exhibition next click', {left: container.scrollLeft}); scrollNext(); });
    prevBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); console.log('exhibition prev click', {left: container.scrollLeft}); scrollPrev(); });

    // Touch support for mobile devices (immediate activation)
    nextBtn.addEventListener('touchstart', function (e) { e.preventDefault(); console.log('exhibition next touch'); scrollNext(); }, { passive: false });
    prevBtn.addEventListener('touchstart', function (e) { e.preventDefault(); console.log('exhibition prev touch'); scrollPrev(); }, { passive: false });

    container.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { scrollNext(); }
      else if (e.key === 'ArrowLeft') { scrollPrev(); }
    });

    container.addEventListener('mouseenter', pauseAutoPlay);
    container.addEventListener('mouseleave', resumeAutoPlay);
    container.addEventListener('focusin', pauseAutoPlay);
    container.addEventListener('focusout', resumeAutoPlay);

    window.addEventListener('resize', debounce(function () {
      refreshMeasurements();
      // Ensure still positioned within original set after resize
      var firstOriginal = track.querySelector('.exhibition__card:not(.clone)');
      if (firstOriginal) container.scrollLeft = Math.max(0, firstOriginal.offsetLeft);
    }, 200));

    // init
    refreshMeasurements();
    startAutoPlay();
  }


  // ==========================================================================
  // Enquiry Form (View Only - No Validation)
  // ==========================================================================
  // No JS required for form as per assessment focus on view only.

  // ==========================================================================
  // Smooth Scroll for Anchor Links
  // ==========================================================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;

        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start'
          });
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  

  // ==========================================================================
  // Initialize All Components
  // ==========================================================================

  function init() {
    initHeaderScroll();
    initHeroSlider();
    initSchoolsSlider();
    initChooseSlider();
    initExhibitionSlider();
    initEnquiryForm();
    initSmoothScroll();
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();