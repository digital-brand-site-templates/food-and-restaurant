/*
Template Name: FoodVivers
File Name: main.js
Author Name: ThemeVault
Author URI: https://www.themevault.net/
Version: 2.0

Dependency-free. Bootstrap's own bundle drives the menu collapse, the tabs
and the three carousels; everything below replaces what jQuery, counterUp,
waypoints, custom.js and the inline script used to do.
*/
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Back to top — custom.js faded it in past 100px and animated the scroll. */
    var toTop = document.getElementById("back-to-top");
    if (toTop) {
        var toggleToTop = function () { toTop.classList.toggle("is-visible", window.scrollY > 100); };
        toggleToTop();
        window.addEventListener("scroll", toggleToTop, { passive: true });
        toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
    }

    /* Counters — the inline script ran counterUp on every .counter once it
       scrolled into view (delay 10, time 1000). Same thing, counting from
       data-min to data-max over a second; the "$0" counter stays 0. */
    var counters = document.querySelectorAll(".counter[data-max]");
    if (counters.length) {
        var run = function (el) {
            var to = parseInt(el.getAttribute("data-max"), 10) || 0;
            var from = parseInt(el.getAttribute("data-min"), 10) || 0;
            var start = null;
            var step = function (ts) {
                if (start === null) start = ts;
                var p = Math.min(1, (ts - start) / 1000);
                el.textContent = String(Math.round(from + (to - from) * p));
                if (p < 1) requestAnimationFrame(step);
            };
            if (reduceMotion || !("requestAnimationFrame" in window)) { el.textContent = String(to); return; }
            requestAnimationFrame(step);
        };
        if ("IntersectionObserver" in window) {
            var seen = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    run(en.target); seen.unobserve(en.target);
                });
            }, { threshold: 0.5 });
            counters.forEach(function (el) { seen.observe(el); });
        } else {
            counters.forEach(run);
        }
    }

    /* Tapping a link in the collapsed menu closes it. */
    var collapse = document.querySelector(".navbar-collapse");
    if (collapse) {
        collapse.addEventListener("click", function (e) {
            var link = e.target.closest("a");
            if (!link || !collapse.classList.contains("show")) return;
            var inst = window.bootstrap && bootstrap.Collapse.getInstance(collapse);
            if (inst) inst.hide();
        });
    }

    /* Forms: validate, then say so — a static template posts nowhere. */
    document.querySelectorAll("form").forEach(function (form) {
        var note = form.querySelector(".tv-form-note");
        if (!note) return;
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var ok = true;
            form.querySelectorAll("[required]").forEach(function (f) {
                var bad = !f.checkValidity();
                f.classList.toggle("is-invalid", bad);
                if (bad && ok) { f.focus(); ok = false; }
            });
            if (!ok) return;
            note.hidden = false; note.focus();
            form.reset();
        });
        form.querySelectorAll("[required]").forEach(function (f) {
            f.addEventListener("input", function () { if (f.checkValidity()) f.classList.remove("is-invalid"); });
        });
    });
    /* ----------------------------------------------------------------------
       Menu search — both header boxes submit to menu.html?q=…; this keeps
       the dishes whose name or line mention it and says what was searched.
       The food tabs' tiles and the sidebar labels link here the same way. */
    var q = new URLSearchParams(location.search).get("q");
    var dishes = document.getElementById("dishes");
    if (q && dishes) {
        var needle = q.trim().toLowerCase();
        var items = Array.prototype.slice.call(dishes.querySelectorAll(".tv-dish"));
        var kept = 0;
        items.forEach(function (it) {
            var hit = it.textContent.toLowerCase().indexOf(needle) > -1;
            it.hidden = !hit; if (hit) kept++;
        });
        dishes.querySelectorAll(".tv-menu-group").forEach(function (g) {
            g.hidden = !g.querySelector(".tv-dish:not([hidden])");
        });
        var line = document.createElement("p");
        line.className = "tv-search-summary";
        var safe = document.createElement("span"); safe.textContent = q;
        line.innerHTML = (kept ? kept + " dish" + (kept === 1 ? "" : "es") + " matching " : "No dishes match ")
            + "<strong>" + safe.innerHTML + "</strong> — <a href=\"menu.html\">show the whole menu</a>";
        dishes.parentNode.insertBefore(line, dishes);
        var box = document.getElementById("site-search");
        if (box) box.value = q;
        var box2 = document.getElementById("menu-site-search");
        if (box2) box2.value = q;
    }

    /* Lightbox — the gallery's photographs ([data-image-popup]) open in a
       viewer: arrows and the keyboard step through the set, Escape or a
       click outside closes, focus is restored. (Owner's pick, 2026-09-15.) */
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
            lbImg.alt = link.getAttribute("aria-label") || "Gallery image";
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

})();
