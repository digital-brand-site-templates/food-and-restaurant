/*
Template Name: citreat
File Name: main.js
Author Name: ThemeVault
Author URI: https://www.themevault.net/
Version: 2.0

Dependency-free. Bootstrap's own bundle drives the navbar, tabs, carousel,
accordion and scrollspy; everything below replaces what jQuery and its plugins
used to do.
*/
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* v1 (js/scrolling-nav.js): past 50px scroll the fixed navbar goes solid,
       toggling four classes v1's own CSS keys on. */
    (function () {
        var navbar = document.querySelector(".tv-navbar-custom");
        var brand = document.querySelector(".navbar-brand");
        var links = document.querySelectorAll(".navbar-nav > li > a");
        var navList = document.querySelector(".navbar-nav");
        if (!navbar) return;
        var toggle = function () {
            var on = window.scrollY > 50;
            navbar.classList.toggle("nav-scroll", on);
            if (brand) brand.classList.toggle("tv-scroll-logo", on);
            links.forEach(function (a) { a.classList.toggle("menu-scroll-menu", on); });
            if (navList) navList.classList.toggle("menu-active", on);
        };
        toggle();
        window.addEventListener("scroll", toggle, { passive: true });
    })();

    /* v1 (js/custom.js:15): jQuery(".hover").mouseleave(function () { jQuery(this).removeClass("hover"); }); */
    document.querySelectorAll(".hover").forEach(function (el) {
        el.addEventListener("mouseleave", function () { el.classList.remove("hover"); });
    });

    /* Back to top — fades in past 100px, returns to the top */
    var toTop = document.getElementById("back-to-top");
    if (toTop) {
        var toggleToTop = function () { toTop.classList.toggle("is-visible", window.scrollY > 100); };
        toggleToTop();
        window.addEventListener("scroll", toggleToTop, { passive: true });
        toTop.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        });
    }

    /* Tapping a link in the collapsed menu closes it. The dropdown-toggle
       exclusion matters: without it, adding a submenu later makes the whole
       menu retract the moment it is tapped. */
    var collapse = document.querySelector(".navbar-collapse");
    if (collapse) {
        collapse.addEventListener("click", function (e) {
            var link = e.target.closest("a.nav-link");
            if (!link || link.classList.contains("dropdown-toggle")) return;
            if (!collapse.classList.contains("show")) return;
            var inst = window.bootstrap && bootstrap.Collapse.getInstance(collapse);
            if (inst) inst.hide();
        });
    }

    /* Counters — replaces counterUp + waypoints. The real number stays in the
       markup until the moment it animates, so anyone without JS still sees it. */
    var counters = document.querySelectorAll(".counter");
    if (counters.length) {
        var runCounter = function (el) {
            var target = parseInt(String(el.dataset.target || el.textContent).replace(/\D/g, ""), 10);
            if (!isFinite(target)) return;
            if (reduceMotion) { el.textContent = String(target); return; }
            el.textContent = "0";
            var started = null;
            var step = function (now) {
                if (started === null) started = now;
                var progress = Math.min((now - started) / 1000, 1);
                el.textContent = String(Math.floor(progress * target));
                if (progress < 1) requestAnimationFrame(step); else el.textContent = String(target);
            };
            requestAnimationFrame(step);
        };
        if ("IntersectionObserver" in window) {
            var io = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); obs.unobserve(en.target); } });
            }, { threshold: 0.4 });
            counters.forEach(function (c) { c.dataset.target = c.textContent.trim(); io.observe(c); });
        } else counters.forEach(runCounter);
    }

    /* Lightbox — replaces magnific-popup. Arrows and the keyboard step through
       the set; focus is trapped and restored. */
    var popupLinks = Array.prototype.slice.call(document.querySelectorAll("[data-image-popup]"));
    if (popupLinks.length) {
        var box = document.createElement("div");
        box.className = "tv-lightbox";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", "Image viewer");
        box.innerHTML =
            '<button type="button" class="tv-lb-close" aria-label="Close">&times;</button>' +
            '<button type="button" class="tv-lb-prev" aria-label="Previous image">&#10094;</button>' +
            '<img alt="">' +
            '<button type="button" class="tv-lb-next" aria-label="Next image">&#10095;</button>';
        document.body.appendChild(box);
        var lbImg = box.querySelector("img"), current = 0, lastFocus = null;
        var show = function (i) {
            current = (i + popupLinks.length) % popupLinks.length;
            var link = popupLinks[current];
            lbImg.src = link.getAttribute("href");
            var inner = link.querySelector("img");
            lbImg.alt = (inner && inner.getAttribute("alt")) || "Gallery image";
        };
        var open = function (i) {
            lastFocus = document.activeElement; show(i);
            box.classList.add("is-open"); document.body.style.overflow = "hidden";
            box.querySelector(".tv-lb-close").focus();
        };
        var close = function () {
            box.classList.remove("is-open"); document.body.style.overflow = "";
            lbImg.removeAttribute("src"); if (lastFocus) lastFocus.focus();
        };
        popupLinks.forEach(function (link, i) { link.addEventListener("click", function (e) { e.preventDefault(); open(i); }); });
        box.querySelector(".tv-lb-close").addEventListener("click", close);
        box.querySelector(".tv-lb-prev").addEventListener("click", function () { show(current - 1); });
        box.querySelector(".tv-lb-next").addEventListener("click", function () { show(current + 1); });
        box.addEventListener("click", function (e) { if (e.target === box) close(); });
        document.addEventListener("keydown", function (e) {
            if (!box.classList.contains("is-open")) return;
            if (e.key === "Escape") close();
            if (e.key === "ArrowLeft") show(current - 1);
            if (e.key === "ArrowRight") show(current + 1);
        });
    }

    /* ------------------------------------------------------------------
       Carousels — replaces Owl Carousel (and jQuery with it). Config
       travels on data-owl, e.g. data-owl='{"items":3,"loop":true,"margin":10}':
         items / responsive   how many show at each MIN width ({"0":1,"768":2})
         nav, dots            arrows / pager
         loop                 wrap around — with CLONES, as Owl does
         speed                transition in ms (Owl's 250 default)
         autoplay             interval in ms, or falsy for none
       ------------------------------------------------------------------ */
    document.querySelectorAll("[data-owl]").forEach(function (root) {
        var cfg;
        try { cfg = JSON.parse(root.getAttribute("data-owl")); } catch (e) { return; }
        var slides = Array.prototype.filter.call(root.children, function (c) { return c.nodeType === 1; });
        if (!slides.length) return;
        var speed = reduceMotion ? 0 : (cfg.speed || 250);
        var loop = !!cfg.loop && slides.length > 1;

        var stage = document.createElement("div");
        stage.className = "owl-stage";
        var outer = document.createElement("div");
        outer.className = "owl-stage-outer";
        outer.appendChild(stage);

        var wrap = function (el, cloned) {
            var item = document.createElement("div");
            item.className = "owl-item" + (cloned ? " cloned" : "");
            if (cloned) item.setAttribute("aria-hidden", "true");
            item.appendChild(el);
            return item;
        };
        if (loop) slides.forEach(function (el) { stage.appendChild(wrap(el.cloneNode(true), true)); });
        slides.forEach(function (el) { stage.appendChild(wrap(el, false)); });
        if (loop) slides.forEach(function (el) { stage.appendChild(wrap(el.cloneNode(true), true)); });

        root.textContent = "";
        root.appendChild(outer);
        root.classList.add("owl-loaded", "owl-drag");

        var items = Array.prototype.slice.call(stage.children);
        var count = slides.length;
        var index = loop ? count : 0;
        var timer = null, animating = false;

        var nav = document.createElement("div");
        nav.className = "owl-nav" + (cfg.nav ? "" : " disabled");
        ["prev", "next"].forEach(function (dir) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "owl-" + dir;
            b.setAttribute("aria-label", dir === "prev" ? "Previous slide" : "Next slide");
            b.innerHTML = (cfg.navHtml && cfg.navHtml[dir]) || '<i class="fas fa-angle-' + (dir === "prev" ? "left" : "right") + '" aria-hidden="true"></i>';
            b.addEventListener("click", function () { go(dir === "next" ? 1 : -1); restartAutoplay(); });
            nav.appendChild(b);
        });
        root.appendChild(nav);

        var dots = document.createElement("div");
        dots.className = "owl-dots" + (cfg.dots ? "" : " disabled");
        root.appendChild(dots);

        var perView = function () {
            var w = window.innerWidth, n = cfg.items || 1;
            Object.keys(cfg.responsive || {})
                .map(Number).sort(function (a, b) { return a - b; })
                .forEach(function (bp) { if (w >= bp) n = cfg.responsive[bp]; });
            return Math.max(1, Math.min(n, count));
        };
        var itemWidth = function () {
            var n = perView(), gap = cfg.margin || 0;
            return (root.clientWidth - gap * (n - 1)) / n;
        };
        var step = function () { return loop ? 1 : perView(); };
        var lastIndex = function () { return loop ? items.length - 1 : Math.max(0, count - perView()); };

        var setTransform = function (withTransition) {
            var gap = cfg.margin || 0;
            stage.style.transition = withTransition && speed ? "transform " + speed + "ms ease" : "none";
            stage.style.transform = "translateX(" + (-index * (itemWidth() + gap)) + "px)";
            var real = loop ? ((index - count) % count + count) % count : index;
            Array.prototype.forEach.call(dots.children, function (d, i) {
                d.classList.toggle("active", i === Math.floor(real / step()));
            });
            items.forEach(function (it, i) { it.classList.toggle("active", i >= index && i < index + perView()); });
        };

        var guard = null;
        var go = function (d) {
            if (animating) return;
            var target = index + d * step();
            if (!loop) target = Math.max(0, Math.min(lastIndex(), target));
            if (target === index) return;
            index = target;
            animating = speed > 0;
            setTransform(true);
            if (!animating) { settleLoop(); return; }
            clearTimeout(guard);
            guard = setTimeout(settleLoop, speed + 100);
        };
        var settleLoop = function () {
            clearTimeout(guard);
            animating = false;
            if (!loop) return;
            if (index >= 2 * count) { index -= count; setTransform(false); }
            else if (index < count) { index += count; setTransform(false); }
        };
        stage.addEventListener("transitionend", function (e) { if (e.target === stage) settleLoop(); });

        var layout = function () {
            if (!root.clientWidth) return;
            var width = itemWidth(), gap = cfg.margin || 0;
            items.forEach(function (it) {
                it.style.width = width + "px";
                it.style.marginRight = gap + "px";
            });
            stage.style.width = (width + gap) * items.length + "px";
            if (!loop && index > lastIndex()) index = lastIndex();
            nav.classList.toggle("disabled", !cfg.nav || count <= perView());
            dots.textContent = "";
            var pages = Math.max(1, Math.ceil(count / step()));
            for (var i = 0; i < pages; i++) {
                (function (i) {
                    var d = document.createElement("button");
                    d.type = "button";
                    d.className = "owl-dot";
                    d.setAttribute("aria-label", "Go to slide " + (i + 1));
                    d.appendChild(document.createElement("span"));
                    d.addEventListener("click", function () { index = (loop ? count : 0) + i * step(); setTransform(true); restartAutoplay(); });
                    dots.appendChild(d);
                })(i);
            }
            setTransform(false);
        };

        var restartAutoplay = function () {
            if (!cfg.autoplay || reduceMotion) return;
            clearInterval(timer);
            timer = setInterval(function () { go(1); }, cfg.autoplay);
        };
        root.addEventListener("mouseenter", function () { clearInterval(timer); });
        root.addEventListener("mouseleave", restartAutoplay);
        restartAutoplay();

        var startX = null;
        var onDown = function (x) { startX = x; };
        var onUp = function (x) {
            if (startX === null) return;
            var dx = x - startX;
            startX = null;
            if (Math.abs(dx) < 40) return;
            go(dx < 0 ? 1 : -1);
            restartAutoplay();
        };
        root.addEventListener("touchstart", function (e) { onDown(e.touches[0].clientX); }, { passive: true });
        root.addEventListener("touchend", function (e) { onUp(e.changedTouches[0].clientX); }, { passive: true });

        layout();
        if ("ResizeObserver" in window) {
            var lastW = root.clientWidth;
            new ResizeObserver(function () {
                if (root.clientWidth === lastW) return;
                lastW = root.clientWidth;
                layout();
            }).observe(root);
        } else {
            var t;
            window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(layout, 150); }, { passive: true });
        }
    });

    /* A static template posts nowhere, so rather than pretend, validate and
       say so plainly. Every form that wants this — the reservation form and
       the contact-us form both do, under different v1 classes — carries its
       own .tv-form-note, so that is what binds the handler rather than a
       class name. */
    Array.prototype.slice.call(document.querySelectorAll("form")).forEach(function (form) {
        if (!form.querySelector(".tv-form-note")) return;
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
            var note = form.querySelector(".tv-form-note");
            if (note) { note.hidden = false; note.focus(); }
            form.reset(); form.classList.remove("was-validated");
        });
    });

    /* One-page nav highlight — replaces BS3 scrollspy (v1: data-spy="scroll"
       on <body id="onepage">). BS5's own scrollspy watches for its target id
       via IntersectionObserver, but here "Home" points at #onepage, which is
       the <body> itself — the root is never reported as "the current
       section", so Home never lights up even at the very top of the page,
       where v1's own scrollspy always marks it active. A plain scroll-
       position check sidesteps that gap and matches v1's behaviour exactly. */
    if (document.body.id === "onepage") {
        var spyLinks = Array.prototype.slice.call(document.querySelectorAll('#tv-navbar .nav-link[href^="#"]'));
        var spyTargets = spyLinks.map(function (a) {
            var id = a.getAttribute("href").slice(1);
            return { link: a, el: document.getElementById(id) || document.body };
        });
        var updateSpy = function () {
            var y = window.scrollY + 60;
            var current = spyTargets[0];
            spyTargets.forEach(function (t) {
                var top = t.el.getBoundingClientRect().top + window.scrollY;
                if (top <= y) current = t;
            });
            spyTargets.forEach(function (t) { t.link.classList.toggle("active", t === current); });
        };
        updateSpy();
        window.addEventListener("scroll", updateSpy, { passive: true });
    }
})();
