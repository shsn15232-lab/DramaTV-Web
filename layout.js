"use strict";

/* =========================================
   DRAMATV - PREMIUM LAYOUT
   Hamburger menu + clearer hero poster
========================================= */

(function () {
    const DOWNLOAD_URL =
        "https://github.com/shsn15232-lab/DramaTV-Data/releases/download/v1.0.0/DramaTV.apk";

    const TELEGRAM_URL = "https://t.me/Drama_vT";

    function addStyles() {
        if (document.getElementById("dt-layout-styles")) return;

        const style = document.createElement("style");
        style.id = "dt-layout-styles";

        style.textContent = `
            /* REMOVE COUNTERS */
            .welcome-section .stats,
            .welcome-section .stat-item,
            #movieCount,
            #seriesCount,
            #moviesHeadingCount,
            #seriesHeadingCount {
                display: none !important;
            }

            .welcome-section {
                justify-content: center !important;
            }

            /* MENU BUTTON */
            .dt-menu-button {
                width: 43px;
                height: 43px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 5px;
                border: 1px solid #ffffff18;
                border-radius: 12px;
                background: #191919;
                cursor: pointer;
                flex-shrink: 0;
                transition: .2s ease;
            }

            .dt-menu-button:hover {
                background: #292929;
                border-color: #e50914;
            }

            .dt-menu-button span {
                display: block;
                width: 19px;
                height: 2px;
                border-radius: 5px;
                background: #fff;
                transition: .2s ease;
            }

            /* DRAWER BACKDROP */
            .dt-drawer-backdrop {
                position: fixed;
                inset: 0;
                z-index: 998;
                background: rgba(0,0,0,.72);
                opacity: 0;
                visibility: hidden;
                transition: .25s ease;
                backdrop-filter: blur(4px);
            }

            .dt-drawer-backdrop.open {
                opacity: 1;
                visibility: visible;
            }

            /* SIDE DRAWER */
            .dt-drawer {
                position: fixed;
                z-index: 999;
                top: 0;
                right: 0;
                width: min(370px, 88vw);
                height: 100dvh;
                overflow-y: auto;
                background: #101010;
                border-left: 1px solid #ffffff12;
                box-shadow: -15px 0 55px #0009;
                transform: translateX(105%);
                transition: transform .3s ease;
                padding: 22px 16px 35px;
                direction: rtl;
            }

            .dt-drawer.open {
                transform: translateX(0);
            }

            .dt-drawer-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 18px;
                border-bottom: 1px solid #ffffff12;
                margin-bottom: 18px;
            }

            .dt-drawer-brand {
                font-size: 22px;
                font-weight: 900;
                direction: ltr;
            }

            .dt-drawer-brand span {
                color: #e50914;
            }

            .dt-drawer-close {
                width: 38px;
                height: 38px;
                border-radius: 11px;
                background: #222;
                color: #fff;
                font-size: 25px;
                cursor: pointer;
            }

            .dt-drawer-links {
                display: grid;
                gap: 9px;
                margin-bottom: 20px;
            }

            .dt-drawer-link {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 13px 14px;
                border-radius: 11px;
                background: #191919;
                border: 1px solid #ffffff0c;
                color: #eee;
                font-family: inherit;
                font-size: 13px;
                font-weight: 800;
                text-decoration: none;
                cursor: pointer;
                text-align: right;
            }

            .dt-drawer-link:hover {
                background: #252020;
                border-color: #e509144d;
            }

            .dt-drawer-link .dt-link-icon {
                width: 31px;
                height: 31px;
                display: grid;
                place-items: center;
                border-radius: 9px;
                background: #292020;
                font-size: 17px;
            }

            .dt-drawer .dt-extra-section {
                padding: 19px 0 !important;
                margin: 0 !important;
                border-top: 1px solid #ffffff12;
            }

            .dt-drawer .dt-extra-heading {
                margin-bottom: 13px !important;
            }

            .dt-drawer .dt-extra-heading h2 {
                font-size: 16px !important;
            }

            .dt-drawer .dt-extra-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 12px !important;
            }

            .dt-drawer .dt-extra-card strong {
                font-size: 10px !important;
            }

            .dt-drawer .dt-empty {
                font-size: 11px;
            }

            .dt-drawer-download {
                display: block;
                margin-top: 18px;
                padding: 14px;
                border-radius: 12px;
                background: linear-gradient(120deg, #ed2535, #a90012);
                text-align: center;
                color: #fff;
                font-size: 13px;
                font-weight: 900;
                text-decoration: none;
            }

            .dt-drawer-telegram {
                display: block;
                margin-top: 9px;
                padding: 13px;
                border-radius: 12px;
                background: #168bd0;
                text-align: center;
                color: #fff;
                font-size: 13px;
                font-weight: 900;
                text-decoration: none;
            }

            body.dt-drawer-open {
                overflow: hidden;
            }

            /* CLEARER HERO POSTER */
            .hero {
                min-height: 570px !important;
                background: #080808 !important;
                position: relative;
                isolation: isolate;
            }

            .hero-art {
                z-index: 0 !important;
                inset: 0 !important;
                opacity: 1 !important;
                transform: none !important;
                background-image: none !important;
                overflow: hidden;
            }

            .dt-hero-poster {
                position: absolute;
                top: 0;
                right: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 25%;
                opacity: 1;
                display: block;
                transition: opacity .35s ease;
            }

            .hero-overlay {
                z-index: 1 !important;
                background:
                    linear-gradient(
                        0deg,
                        #080808 0%,
                        rgba(8,8,8,.72) 12%,
                        rgba(8,8,8,.16) 48%,
                        rgba(8,8,8,.02) 100%
                    ) !important;
            }

            .hero-content {
                z-index: 3 !important;
                align-self: flex-end;
                padding-bottom: 25px;
                max-width: 700px !important;
                text-shadow: 0 2px 15px #000;
            }

            .hero h1 {
                text-shadow: 0 3px 18px #000 !important;
            }

            .hero p {
                color: #f0f0f0 !important;
                text-shadow: 0 2px 10px #000;
            }

            .hero-bottom,
            .hero-controls {
                z-index: 4 !important;
            }

            @media(max-width: 600px) {
                .dt-menu-button {
                    width: 37px;
                    height: 37px;
                    border-radius: 10px;
                }

                .dt-menu-button span {
                    width: 17px;
                }

                .hero {
                    min-height: 480px !important;
                    padding: 35px 6% 85px !important;
                }

                .dt-hero-poster {
                    object-position: center 20%;
                }

                .hero-content {
                    padding-bottom: 5px;
                }

                .hero h1 {
                    font-size: 30px !important;
                    line-height: 1.35 !important;
                }

                .hero p {
                    font-size: 12px !important;
                    line-height: 1.8 !important;
                }
            }

            @media(min-width: 900px) {
                .hero {
                    min-height: 620px !important;
                }

                .dt-hero-poster {
                    object-position: center 22%;
                }

                .hero-content {
                    max-width: 650px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =========================================
       DRAWER MENU
    ========================================= */

    function createDrawer() {
        if (document.getElementById("dt-drawer")) return;

        const headerActions = document.querySelector(".header-actions");
        if (!headerActions) return;

        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className = "dt-menu-button";
        menuButton.id = "dtMenuButton";
        menuButton.setAttribute("aria-label", "فتح القائمة");
        menuButton.setAttribute("aria-expanded", "false");

        menuButton.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        headerActions.prepend(menuButton);

        const backdrop = document.createElement("div");
        backdrop.className = "dt-drawer-backdrop";
        backdrop.id = "dtDrawerBackdrop";

        const drawer = document.createElement("aside");
        drawer.className = "dt-drawer";
        drawer.id = "dt-drawer";
        drawer.setAttribute("aria-label", "القائمة الرئيسية");

        drawer.innerHTML = `
            <div class="dt-drawer-top">
                <div class="dt-drawer-brand">Drama<span>TV</span></div>
                <button class="dt-drawer-close" id="dtDrawerClose"
                        type="button" aria-label="إغلاق">×</button>
            </div>

            <nav class="dt-drawer-links">
                <a class="dt-drawer-link" href="#home">
                    <span class="dt-link-icon">⌂</span>
                    الرئيسية
                </a>

                <a class="dt-drawer-link" href="#movies">
                    <span class="dt-link-icon">🎬</span>
                    الأفلام
                </a>

                <a class="dt-drawer-link" href="#series">
                    <span class="dt-link-icon">📺</span>
                    المسلسلات
                </a>
            </nav>

            <div id="dtDrawerSections"></div>

            <a class="dt-drawer-download"
               href="${DOWNLOAD_URL}"
               target="_blank" rel="noopener">
                ⬇ تحميل تطبيق DramaTV
            </a>

            <a class="dt-drawer-telegram"
               href="${TELEGRAM_URL}"
               target="_blank" rel="noopener">
                ✈ قناة DramaTV على تيليجرام
            </a>
        `;

        document.body.append(backdrop, drawer);

        const open = () => {
            drawer.classList.add("open");
            backdrop.classList.add("open");
            document.body.classList.add("dt-drawer-open");
            menuButton.setAttribute("aria-expanded", "true");
        };

        const close = () => {
            drawer.classList.remove("open");
            backdrop.classList.remove("open");
            document.body.classList.remove("dt-drawer-open");
            menuButton.setAttribute("aria-expanded", "false");
        };

        menuButton.addEventListener("click", open);
        backdrop.addEventListener("click", close);

        drawer.querySelector("#dtDrawerClose")
            .addEventListener("click", close);

        drawer.addEventListener("click", event => {
            if (event.target.closest("a")) {
                close();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") close();
        });

        moveFeatureSections(drawer);

        const observer = new MutationObserver(() => {
            moveFeatureSections(drawer);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /* =========================================
       MOVE FEATURE SECTIONS TO MENU
    ========================================= */

    function moveFeatureSections(drawer) {
        const target = drawer.querySelector("#dtDrawerSections");
        if (!target) return;

        [
            "dt-favorites",
            "dt-continue",
            "dt-popular"
        ].forEach(id => {
            const section = document.getElementById(id);

            if (section && section.parentElement !== target) {
                target.appendChild(section);
            }
        });
    }

    /* =========================================
       HERO POSTER FIX
    ========================================= */

    function setupHeroPoster() {
        const heroArt = document.getElementById("heroArt");
        if (!heroArt) return;

        function extractPoster(background) {
            if (!background || background === "none") {
                return "";
            }

            /* FIXED URL EXTRACTION */
            const match = background.match(
                /url\((?:"|')?(.*?)(?:"|')?\)/i
            );

            if (!match || !match[1]) {
                return "";
            }

            return match[1].replace(/%27/g, "'");
        }

        function updatePoster() {
            const background = heroArt.style.backgroundImage;
            const posterUrl = extractPoster(background);

            if (!posterUrl) return;

            let image = heroArt.querySelector(".dt-hero-poster");

            if (!image) {
                image = document.createElement("img");
                image.className = "dt-hero-poster";
                image.alt = "بوستر العمل المميز";
                image.loading = "eager";
                image.decoding = "async";

                heroArt.appendChild(image);
            }

            if (image.getAttribute("src") !== posterUrl) {
                image.src = posterUrl;
            }

            heroArt.style.backgroundImage = "none";
        }

        updatePoster();

        const observer = new MutationObserver(updatePoster);

        observer.observe(heroArt, {
            attributes: true,
            attributeFilter: ["style"]
        });

        setTimeout(updatePoster, 300);
        setTimeout(updatePoster, 1000);
        setTimeout(updatePoster, 2000);
    }

    /* =========================================
       INITIALIZATION
    ========================================= */

    function init() {
        addStyles();
        createDrawer();
        setupHeroPoster();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
