"use strict";

/* =========================================
   DRAMATV - EXTRA FEATURES
   Favorites, Continue Browsing, Popular, Ratings
========================================= */

(function () {
    const KEYS = {
        favorites: "dramatv_favorites_v1",
        history: "dramatv_history_v1",
        popular: "dramatv_popular_v1",
        ratings: "dramatv_ratings_v1"
    };

    function read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value === null ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("DramaTV storage:", error);
        }
    }

    function escapeHTML(value) {
        return String(value || "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[أإآٱ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/ة/g, "ه")
            .replace(/[ـًٌٍَُِّْ]/g, "")
            .replace(/\s+/g, " ");
    }

    function itemKey(type, title) {
        return type + "::" + normalize(title);
    }

    function detailsUrl(type, title) {
        return "details.html?type=" +
            encodeURIComponent(type) +
            "&title=" +
            encodeURIComponent(title);
    }

    function getCards() {
        return Array.from(document.querySelectorAll(
            "#moviesGrid .content-card, #seriesGrid .content-card"
        )).map(card => {
            const type = card.dataset.type;
            const title = card.querySelector("h3")?.textContent?.trim() || "";
            const image = card.querySelector("img")?.src || "";
            const subtitle = card.querySelector(".card-info p")?.textContent?.trim() || "";

            return {
                type,
                title,
                image,
                subtitle,
                key: itemKey(type, title),
                url: detailsUrl(type, title)
            };
        }).filter(item => item.title && item.type);
    }

    function injectStyles() {
        if (document.getElementById("dramatv-extra-styles")) return;

        const style = document.createElement("style");
        style.id = "dramatv-extra-styles";

        style.textContent = `
            .dt-extra-section {
                padding: 28px 6%;
                max-width: 1500px;
                margin: auto;
            }

            .dt-extra-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 18px;
            }

            .dt-extra-heading h2 {
                color: #fff;
                font-size: 21px;
                font-weight: 900;
                margin: 0;
            }

            .dt-extra-heading span {
                color: #888;
                font-size: 11px;
            }

            .dt-extra-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 15px;
            }

            .dt-extra-card {
                min-width: 0;
                color: #fff;
                text-decoration: none;
                display: block;
                position: relative;
            }

            .dt-extra-card a {
                color: inherit;
                text-decoration: none;
            }

            .dt-extra-card img {
                display: block;
                width: 100%;
                aspect-ratio: 2 / 3;
                object-fit: cover;
                border-radius: 10px;
                background: #1b1b1b;
                border: 1px solid #292929;
            }

            .dt-extra-card strong {
                display: block;
                font-size: 11px;
                line-height: 1.7;
                margin-top: 7px;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .dt-extra-card small {
                color: #888;
                font-size: 10px;
            }

            .dt-favorite-button {
                position: absolute;
                top: 8px;
                left: 8px;
                z-index: 5;
                width: 34px;
                height: 34px;
                border: 1px solid #ffffff30;
                border-radius: 50%;
                background: #080808d9;
                color: #fff;
                font-size: 19px;
                cursor: pointer;
                display: grid;
                place-items: center;
                transition: .2s;
            }

            .dt-favorite-button.active {
                color: #ff3344;
                background: #25090d;
                border-color: #e50914;
            }

            .dt-favorite-button:active {
                transform: scale(.9);
            }

            .dt-remove-favorite {
                display: block;
                margin-top: 7px;
                color: #ff6872;
                background: transparent;
                border: 0;
                font: inherit;
                font-size: 10px;
                cursor: pointer;
            }

            .dt-rating {
                margin-top: 22px;
                padding: 17px;
                background: #141414;
                border: 1px solid #292929;
                border-radius: 13px;
            }

            .dt-rating h3 {
                color: #fff;
                font-size: 15px;
                margin: 0 0 10px;
            }

            .dt-rating-stars {
                display: flex;
                flex-wrap: wrap;
                gap: 7px;
                direction: ltr;
                justify-content: flex-end;
            }

            .dt-rating-stars button {
                border: 0;
                background: transparent;
                color: #666;
                font-size: 27px;
                cursor: pointer;
                padding: 2px;
            }

            .dt-rating-stars button.active {
                color: #ffc247;
            }

            .dt-rating-note {
                color: #999;
                font-size: 11px;
                margin-top: 8px;
            }

            .dt-empty {
                color: #888;
                background: #141414;
                border: 1px solid #292929;
                border-radius: 12px;
                padding: 22px;
                text-align: center;
                font-size: 12px;
                grid-column: 1 / -1;
            }

            @media(max-width: 700px) {
                .dt-extra-section {
                    padding: 22px 5%;
                }

                .dt-extra-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 13px 9px;
                }

                .dt-extra-heading h2 {
                    font-size: 18px;
                }
            }

            @media(min-width: 701px) and (max-width: 950px) {
                .dt-extra-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
            }
        `;

        document.head.appendChild(style);
    }

    function makeSection(id, title, subtitle) {
        let section = document.getElementById(id);
        if (section) return section;

        section = document.createElement("section");
        section.id = id;
        section.className = "dt-extra-section";

        section.innerHTML = `
            <div class="dt-extra-heading">
                <h2>${title}</h2>
                <span>${subtitle || ""}</span>
            </div>
            <div class="dt-extra-grid"></div>
        `;

        return section;
    }

    function makeExtraCard(item, removable) {
        const card = document.createElement("div");
        card.className = "dt-extra-card";

        const image = item.image || "";

        card.innerHTML = `
            <a href="${escapeHTML(item.url)}">
                <img src="${escapeHTML(image)}"
                     alt="${escapeHTML(item.title)}"
                     loading="lazy"
                     decoding="async">
                <strong>${escapeHTML(item.title)}</strong>
                <small>${escapeHTML(item.subtitle)}</small>
            </a>
            ${removable ? `
                <button class="dt-remove-favorite" type="button">
                    إزالة من قائمتي
                </button>
            ` : ""}
        `;

        const img = card.querySelector("img");

        img.addEventListener("error", function () {
            this.style.visibility = "hidden";
        });

        if (removable) {
            card.querySelector(".dt-remove-favorite")
                .addEventListener("click", function () {
                    removeFavorite(item.key);
                });
        }

        return card;
    }

    /* =========================================
       FAVORITES
    ========================================= */

    function getFavorites() {
        return read(KEYS.favorites, []);
    }

    function isFavorite(key) {
        return getFavorites().some(item => item.key === key);
    }

    function toggleFavorite(item) {
        const favorites = getFavorites();
        const index = favorites.findIndex(entry => entry.key === item.key);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.unshift(item);
        }

        write(KEYS.favorites, favorites.slice(0, 300));
        updateFavoriteButtons();
        renderFavorites();
    }

    function removeFavorite(key) {
        const favorites = getFavorites().filter(item => item.key !== key);
        write(KEYS.favorites, favorites);
        updateFavoriteButtons();
        renderFavorites();
    }

    function updateFavoriteButtons() {
        document.querySelectorAll(".dt-favorite-button").forEach(button => {
            const active = isFavorite(button.dataset.key);

            button.classList.toggle("active", active);
            button.textContent = active ? "♥" : "♡";

            button.setAttribute(
                "aria-label",
                active ? "إزالة من قائمتي" : "إضافة إلى قائمتي"
            );
        });
    }

    function addFavoriteButtons() {
        const cards = Array.from(document.querySelectorAll(
            "#moviesGrid .content-card, #seriesGrid .content-card"
        ));

        cards.forEach(card => {
            const type = card.dataset.type;
            const title = card.querySelector("h3")?.textContent?.trim() || "";
            const wrapper = card.querySelector(".poster-wrapper");

            if (!type || !title || !wrapper) return;
            if (wrapper.querySelector(".dt-favorite-button")) return;

            const item = getCards().find(entry =>
                entry.title === title && entry.type === type
            );

            if (!item) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "dt-favorite-button";
            button.dataset.key = item.key;
            button.textContent = isFavorite(item.key) ? "♥" : "♡";

            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                toggleFavorite(item);
            });

            wrapper.appendChild(button);
        });
    }

    function renderFavorites() {
        const section = document.getElementById("dt-favorites");
        if (!section) return;

        const grid = section.querySelector(".dt-extra-grid");
        const favorites = getFavorites();

        grid.innerHTML = "";

        if (!favorites.length) {
            grid.innerHTML = `
                <div class="dt-empty">
                    قائمتك فارغة حالياً. أضف أعمالاً بالضغط على القلب.
                </div>
            `;
            return;
        }

        favorites.forEach(item => {
            grid.appendChild(makeExtraCard(item, true));
        });
    }

    /* =========================================
       CONTINUE BROWSING - FIXED POSTERS
    ========================================= */

    function getHistory() {
        return read(KEYS.history, []);
    }

    function saveHistoryItem(item) {
        if (!item || !item.key) return;

        const history = getHistory();
        const oldItem = history.find(entry => entry.key === item.key);

        const updated = {
            ...(oldItem || {}),
            ...item,
            image: item.image || oldItem?.image || "",
            subtitle: item.subtitle || oldItem?.subtitle || ""
        };

        const next = [
            updated,
            ...history.filter(entry => entry.key !== item.key)
        ].slice(0, 30);

        write(KEYS.history, next);
    }

    function renderHistory() {
        const section = document.getElementById("dt-continue");
        if (!section) return;

        const grid = section.querySelector(".dt-extra-grid");
        const history = getHistory();

        grid.innerHTML = "";

        if (!history.length) {
            grid.innerHTML = `
                <div class="dt-empty">
                    الأعمال التي تفتحها ستظهر هنا حتى ترجع إليها بسهولة.
                </div>
            `;
            return;
        }

        // عرض آخر 6 أعمال مع الاحتفاظ ببوستراتها
        history.slice(0, 6).forEach(item => {
            grid.appendChild(makeExtraCard(item, false));
        });
    }

    function recordVisit(item) {
        saveHistoryItem(item);

        const popular = read(KEYS.popular, {});
        popular[item.key] = Number(popular[item.key] || 0) + 1;

        write(KEYS.popular, popular);
    }

    /* =========================================
       POPULAR
    ========================================= */

    function renderPopular() {
        const section = document.getElementById("dt-popular");
        if (!section) return;

        const grid = section.querySelector(".dt-extra-grid");
        const popular = read(KEYS.popular, {});

        const cards = getCards()
            .map(item => ({
                ...item,
                visits: Number(popular[item.key] || 0)
            }))
            .filter(item => item.visits > 0)
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 6);

        grid.innerHTML = "";

        if (!cards.length) {
            grid.innerHTML = `
                <div class="dt-empty">
                    الأعمال التي تزورها ستظهر هنا مرتبة حسب عدد الزيارات على هذا الجهاز.
                </div>
            `;
            return;
        }

        cards.forEach(item => {
            grid.appendChild(makeExtraCard(item, false));
        });
    }

    /* =========================================
       HOME PAGE
    ========================================= */

    function setupHome() {
        const welcome = document.querySelector(".welcome-section");
        const movies = document.getElementById("movies");

        if (!welcome || !movies) return;

        const favorites = makeSection(
            "dt-favorites",
            "❤️ قائمتي",
            "أعمالك المحفوظة"
        );

        const history = makeSection(
            "dt-continue",
            "▶️ أكمل التصفح",
            "آخر الأعمال التي فتحتها"
        );

        const popular = makeSection(
            "dt-popular",
            "🔥 الأكثر زيارة",
            "حسب نشاط هذا الجهاز"
        );

        welcome.insertAdjacentElement("afterend", favorites);
        favorites.insertAdjacentElement("afterend", history);
        history.insertAdjacentElement("afterend", popular);

        renderFavorites();
        renderHistory();
        renderPopular();

        const observer = new MutationObserver(() => {
            addFavoriteButtons();
            renderPopular();
        });

        ["moviesGrid", "seriesGrid"].forEach(id => {
            const grid = document.getElementById(id);

            if (grid) {
                observer.observe(grid, {
                    childList: true,
                    subtree: true
                });
            }
        });

        addFavoriteButtons();

        document.addEventListener("click", event => {
            if (event.target.closest(".dt-favorite-button")) return;

            const card = event.target.closest(".content-card");
            if (!card) return;

            const title = card.querySelector("h3")?.textContent?.trim();
            const type = card.dataset.type;

            if (!title || !type) return;

            const item = getCards().find(entry =>
                entry.title === title && entry.type === type
            );

            if (item) {
                recordVisit(item);
                renderHistory();
                renderPopular();
            }
        }, true);
    }

    /* =========================================
       DETAILS PAGE - SAVE REAL POSTER
    ========================================= */

    function setupDetails() {
        const params = new URLSearchParams(location.search);
        const title = params.get("title");
        const type = params.get("type");

        if (!title || !["movie", "series"].includes(type)) return;

        const key = itemKey(type, title);

        function getPosterFromPage() {
            const poster =
                document.getElementById("workPoster") ||
                document.querySelector("#page .poster") ||
                document.querySelector("#page img");

            if (!poster) return "";

            const src = poster.getAttribute("src") || poster.src || "";

            if (!src || src.startsWith("data:image/svg")) return "";

            return src;
        }

        function updateHistoryWithPoster() {
            const image = getPosterFromPage();

            const oldItem = getHistory().find(entry => entry.key === key);

            const item = {
                type,
                title,
                key,
                url: location.href,
                image: image || oldItem?.image || "",
                subtitle: type === "series" ? "مسلسل" : "فيلم"
            };

            saveHistoryItem(item);
            renderHistory();
        }

        // نسجل العمل فور فتح صفحة التفاصيل
        updateHistoryWithPoster();

        const page = document.getElementById("page");

        if (page) {
            const posterObserver = new MutationObserver(() => {
                updateHistoryWithPoster();
            });

            posterObserver.observe(page, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["src"]
            });
        }

        /* Ratings */

        const addRating = () => {
            if (!page || page.querySelector(".dt-rating")) return;

            const info = page.querySelector(".info");
            if (!info) return;

            const ratings = read(KEYS.ratings, {});
            const current = Number(ratings[key] || 0);

            const box = document.createElement("div");
            box.className = "dt-rating";

            box.innerHTML = `
                <h3>⭐ قيّم هذا العمل</h3>

                <div class="dt-rating-stars"
                     role="group"
                     aria-label="التقييم من نجمة إلى خمس نجوم">

                    ${[1, 2, 3, 4, 5].map(number => `
                        <button type="button"
                                data-rating="${number}"
                                class="${number <= current ? "active" : ""}"
                                aria-label="${number} من 5">★</button>
                    `).join("")}

                </div>

                <div class="dt-rating-note">
                    ${current
                        ? "تقييمك الحالي: " + current + " من 5"
                        : "اختر عدد النجوم لتسجيل تقييمك"}
                    <br>
                    التقييم محفوظ على هذا الجهاز فقط.
                </div>
            `;

            box.addEventListener("click", event => {
                const button = event.target.closest("[data-rating]");
                if (!button) return;

                const value = Number(button.dataset.rating);

                ratings[key] = value;
                write(KEYS.ratings, ratings);

                box.querySelectorAll("[data-rating]").forEach(star => {
                    star.classList.toggle(
                        "active",
                        Number(star.dataset.rating) <= value
                    );
                });

                box.querySelector(".dt-rating-note").textContent =
                    "تقييمك الحالي: " + value +
                    " من 5 — محفوظ على هذا الجهاز.";
            });

            info.appendChild(box);
        };

        if (page) {
            const ratingObserver = new MutationObserver(addRating);

            ratingObserver.observe(page, {
                childList: true,
                subtree: true
            });

            addRating();
        }
    }

    /* =========================================
       START
    ========================================= */

    function init() {
        injectStyles();

        if (document.getElementById("moviesGrid")) {
            setupHome();
        } else {
            setupDetails();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
