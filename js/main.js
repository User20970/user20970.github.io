/* ==========================================================================
   Xavier Dreschke — Portfolio
   main.js — behavior layer
   Written as small, independent functional modules, each with a single job.
   Libraries: jQuery (DOM wiring), Bootstrap (collapse), Motion (hero
   entrance — https://motion.dev, the vanilla-JS successor to Framer Motion).
   Every animation degrades gracefully: no library and no JS still leaves a
   fully readable page, and prefers-reduced-motion disables movement.
   ========================================================================== */

(function ($) {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = [0.22, 1, 0.36, 1];

  /* ------------------------------------------------------------------
     Module: Theme (light / dark toggle, persisted)
     The initial theme is applied by an inline script in <head> to avoid
     a flash; this module only handles switching.
     ------------------------------------------------------------------ */
  function initTheme() {
    var $html = $(document.documentElement);

    function apply(theme) {
      $html.attr("data-bs-theme", theme);
      try { localStorage.setItem("xd-theme", theme); } catch (e) { /* private mode */ }
      $("#meta-theme").attr("content", theme === "dark" ? "#0a0a0a" : "#ffffff");
      $(document).trigger("xd:theme");
    }

    $("#theme-toggle").on("click", function () {
      var next = $html.attr("data-bs-theme") === "dark" ? "light" : "dark";
      apply(next);
    });
  }

  /* ------------------------------------------------------------------
     Module: Scroll effects (progress rail, navbar state, back-to-top)
     One rAF-throttled scroll listener drives all three.
     ------------------------------------------------------------------ */
  function initScrollEffects() {
    var $bar = $("#scroll-progress");
    var $nav = $("#site-nav");
    var $top = $("#to-top");
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop;
      var pct = max > 0 ? (y / max) * 100 : 0;

      $bar.css("width", pct.toFixed(2) + "%");
      $nav.toggleClass("is-scrolled", y > 10);
      $top.toggleClass("is-visible", y > 520);
      ticking = false;
    }

    $(window).on("scroll resize", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    });
    update();

    $top.on("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------
     Module: Navigation (active-section highlight, mobile menu close)
     ------------------------------------------------------------------ */
  function initNav() {
    var $links = $('#nav-menu .nav-link[href^="#"]');

    // Close the mobile panel after choosing a destination
    $links.on("click", function () {
      var panel = document.getElementById("nav-menu");
      if (panel && panel.classList.contains("show") && window.bootstrap) {
        var collapse = window.bootstrap.Collapse.getOrCreateInstance(panel);
        collapse.hide();
      }
    });

    // Highlight the section currently in view
    if (!("IntersectionObserver" in window)) return;

    var byId = {};
    $links.each(function () {
      byId[this.getAttribute("href").slice(1)] = $(this);
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          $links.removeClass("active").removeAttr("aria-current");
          var $link = byId[entry.target.id];
          if ($link) {
            $link.addClass("active").attr("aria-current", "true");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Module: Reveal-on-scroll
     Elements tagged [data-reveal] fade/slide in. The hiding class is
     added by an inline <body> script only when motion is allowed, so a
     no-JS visit sees everything immediately.
     ------------------------------------------------------------------ */
  function initReveals() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    els.forEach(function (el) {
      var delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.setProperty("--reveal-delay", delay + "s");
    });

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Module: Hero entrance
     Uses Motion (window.Motion) when the CDN loaded; otherwise falls
     back to equivalent CSS transitions. Skipped under reduced motion.
     ------------------------------------------------------------------ */
  function initHeroIntro() {
    var items = document.querySelectorAll("[data-hero]");
    if (!items.length || prefersReduced) return;

    items.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";
    });

    window.setTimeout(function () {
      items.forEach(function (el, i) {
        var delay = 0.1 + i * 0.1;

        if (window.Motion && typeof window.Motion.animate === "function") {
          window.Motion.animate(
            el,
            { opacity: [0, 1], transform: ["translateY(30px)", "translateY(0px)"] },
            { duration: 0.85, delay: delay, easing: EASE, ease: EASE }
          );
        } else {
          el.style.transition =
            "opacity .85s cubic-bezier(.22,1,.36,1) " + delay + "s, " +
            "transform .85s cubic-bezier(.22,1,.36,1) " + delay + "s";
          window.requestAnimationFrame(function () {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          });
        }
      });
    }, 80);
  }

  /* ------------------------------------------------------------------
     Module: Stat count-up
     [data-count] elements count from 0 to their value when visible.
     data-decimals and data-suffix control formatting.
     ------------------------------------------------------------------ */
  function initCounters() {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length) return;

    function finalText(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      return target.toFixed(decimals) + suffix;
    }

    if (prefersReduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = finalText(el); });
      return;
    }

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 1200;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = (target * eased).toFixed(decimals) + (p === 1 ? suffix : "");
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Module: Timeline rail draw-in
     ------------------------------------------------------------------ */
  function initTimeline() {
    var timeline = document.querySelector(".timeline");
    if (!timeline) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      timeline.classList.add("is-drawn");
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(timeline);
  }

  /* ------------------------------------------------------------------
     Module: Hero particles (lightweight canvas)
     ~30 monochrome dots drifting slowly. Pauses when the tab is hidden
     or the hero is scrolled away; disabled under reduced motion.
     ------------------------------------------------------------------ */
  function initParticles() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || prefersReduced) return;

    var ctx = canvas.getContext("2d");
    var hero = canvas.parentElement;
    var dots = [];
    var running = true;
    var inView = true;
    var color = "#0a0a0a";
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function readColor() {
      var v = getComputedStyle(document.documentElement)
        .getPropertyValue("--xd-ink")
        .trim();
      color = v || color;
    }

    function resize() {
      var w = hero.offsetWidth;
      var h = hero.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(w, h);
    }

    function seed(w, h) {
      var count = Math.min(32, Math.max(14, Math.round((w * h) / 42000)));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.8 + Math.random() * 1.4,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.18,
          a: 0.10 + Math.random() * 0.22
        });
      }
    }

    function frame() {
      if (running && inView && !document.hidden) {
        var w = hero.offsetWidth;
        var h = hero.offsetHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = color;

        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -4) d.x = w + 4;
          if (d.x > w + 4) d.x = -4;
          if (d.y < -4) d.y = h + 4;
          if (d.y > h + 4) d.y = -4;

          ctx.globalAlpha = d.a;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      window.requestAnimationFrame(frame);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }).observe(hero);
    }

    $(document).on("xd:theme", readColor);
    $(window).on("resize", resize);

    readColor();
    resize();
    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     Module: Skill-group counts
     Reads the number of badges in each group so counts never drift
     from the content.
     ------------------------------------------------------------------ */
  function initSkillCounts() {
    $(".skill-group").each(function () {
      var n = $(this).find(".skill-badge").length;
      $(this).find(".skill-group__count").text(n);
    });
  }

  /* ------------------------------------------------------------------
     Module: Contact form
     Static hosting (GitHub Pages) has no backend, so the form validates
     input and then opens the visitor's email app with a pre-filled
     message via mailto:.
     ------------------------------------------------------------------ */
  function initContactForm() {
    var $form = $("#contact-form");
    if (!$form.length) return;

    var EMAIL_TO = "xavierdreschke@gmail.com";
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setValidity($field, ok) {
      $field.toggleClass("is-invalid", !ok);
    }

    $form.on("submit", function (e) {
      e.preventDefault();

      var $name = $("#cf-name");
      var $email = $("#cf-email");
      var $msg = $("#cf-message");

      var nameOk = $.trim($name.val()).length > 0;
      var emailOk = emailRe.test($.trim($email.val()));
      var msgOk = $.trim($msg.val()).length >= 10;

      setValidity($name, nameOk);
      setValidity($email, emailOk);
      setValidity($msg, msgOk);

      if (!(nameOk && emailOk && msgOk)) return;

      var subject = "Portfolio inquiry from " + $.trim($name.val());
      var body =
        $.trim($msg.val()) +
        "\n\n—\n" + $.trim($name.val()) +
        "\n" + $.trim($email.val());

      var href =
        "mailto:" + EMAIL_TO +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      $("#form-status").text("Opening your email app with the message pre-filled…");
      window.location.href = href;
    });

    // Clear the error state as the visitor fixes a field
    $form.find(".form-control").on("input", function () {
      $(this).removeClass("is-invalid");
    });
  }

  /* ------------------------------------------------------------------
     Module: Footer year
     ------------------------------------------------------------------ */
  function initYear() {
    $("#year").text(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  $(function () {
    initTheme();
    initScrollEffects();
    initNav();
    initReveals();
    initHeroIntro();
    initCounters();
    initTimeline();
    initParticles();
    initSkillCounts();
    initContactForm();
    initYear();
  });
})(jQuery);
