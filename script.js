"use strict";

/* =========================================
   DRAMATV - WEBSITE ENGINE
========================================= */

const CONFIG = {
    baseUrl: "https://raw.githubusercontent.com/shsn15232-lab/DramaTV-Data/main/",

    movieFiles: [
        "movies_arabic.json",
        "movies_foreign.json",
        "movies_asian.json",
        "movies_indian.json",
        "movies_turkish.json",
        "movies_animation.json"
    ],

    seriesFiles: [
        { file: "section_arabic.json", category: "عربي" },
        { file: "section_asian.json", category: "آسيوي" },
        { file: "section_dubbed.json", category: "مدبلج" },
        { file: "section_foreign.json", category: "أجنبي" },
        { file: "section_ramadan_2026.json", category: "رمضان 2026" },
        { file: "section_short.json", category: "قصير" },
        { file: "section_turkish.json", category: "تركي" }
    ],

    itemsPerPage: 18,
    cacheMaxAge: 7 * 24 * 60 * 60 * 1000,
    heroInterval: 6000,
    maxHeroItems: 6,
    maxSearchResults: 12
};


/* =========================================
   APPLICATION STATE
========================================= */

const state = {
    movies: [],
    series: [],

    filteredMovies: [],
    filteredSeries: [],

    movieCategory: "الكل",
    seriesCategory: "الكل",

    searchQuery: "",
    searchResults: [],

    moviePage: 1,
    seriesPage: 1,

    heroItems: [],
    heroIndex: 0,
    heroTimer: null,

    initialized: false
};


/* =========================================
   DOM ELEMENTS
========================================= */

const elements = {
    moviesGrid: document.getElementById("moviesGrid"),
    seriesGrid: document.getElementById("seriesGrid"),

    movieFilters: document.getElementById("movieFilters"),
    seriesFilters: document.getElementById("seriesFilters"),

    movieCount: document.getElementById("movieCount"),
    seriesCount: document.getElementById("seriesCount"),

    moviesHeadingCount: document.getElementById("moviesHeadingCount"),
    seriesHeadingCount: document.getElementById("seriesHeadingCount"),

    moviesMore: document.getElementById("moviesMore"),
    seriesMore: document.getElementById("seriesMore"),

    searchToggle: document.getElementById("searchToggle"),
    searchContainer: document.getElementById("searchContainer"),
    searchInput: document.getElementById("searchInput"),
    searchResults: null,

    hero: document.querySelector(".hero"),
    heroArt: document.getElementById("heroArt"),
    heroLabel: document.getElementById("heroLabel"),
    heroTitle: document.getElementById("heroTitle"),
    heroDescription: document.getElementById("heroDescription"),
    heroDots: document.getElementById("heroDots"),
    heroPrevious: document.getElementById("heroPrevious"),
    heroNext: document.getElementById("heroNext"),

    modal: document.getElementById("detailsModal"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalClose: document.getElementById("modalClose"),

    modalPoster: document.getElementById("modalPoster"),
    modalTitle: document.getElementById("modalTitle"),
    modalCategory: document.getElementById("modalCategory"),
    modalDescription: document.getElementById("modalDescription"),

    currentYear: document.getElementById("currentYear")
};


/* =========================================
   HELPERS
========================================= */

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[ـًٌٍَُِّْ]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, " ");
}


function normalizeSeriesTitle(value) {
    return normalizeText(value)
        .replace(/^(مسلسل|فيلم)\s*/i, "")
        .trim();
}


function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}


function safeImage(url) {
    if (typeof url !== "string") {
        return "";
    }

    try {
        const parsed = new URL(url);

        if (
            parsed.protocol !== "https:" &&
            parsed.protocol !== "http:"
        ) {
            return "";
        }

        return parsed.href;

    } catch {
        return "";
    }
}


function getPoster(item) {
    return safeImage(
        item.poster ||
        item.posterUrl ||
        item.thumbnail ||
        item.image ||
        ""
    );
}


function getPlaceholder() {
    return "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">' +
            '<rect width="100%" height="100%" fill="#181818"/>' +
            '<text x="50%" y="50%" fill="#777" font-size="25" ' +
            'font-family="Arial" text-anchor="middle" dominant-baseline="middle">' +
            'DramaTV</text></svg>'
        );
}


function getCacheKey(file) {
    return "dramatv_web_" + file;
}


function safeDescription(item) {
    return String(
        item.description ||
        item.overview ||
        "اكتشف تفاصيل هذا العمل على DramaTV."
    );
}


/* =========================================
   GITHUB DATA FETCH
========================================= */

async function fetchJSON(file) {
    const cacheKey = getCacheKey(file);

    try {
        const response = await fetch(
            CONFIG.baseUrl + encodeURIComponent(file) + "?v=" + Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status + ": " + file);
        }

        const data = await response.json();

        try {
            localStorage.setItem(
                cacheKey,
                JSON.stringify({
                    time: Date.now(),
                    data: data
                })
            );
        } catch {
            // التخزين المحلي اختياري
        }

        return data;

    } catch (error) {
        console.warn("DramaTV fetch failed:", file, error);

        try {
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                const parsed = JSON.parse(cached);

                if (
                    parsed &&
                    parsed.data &&
                    Date.now() - parsed.time < CONFIG.cacheMaxAge
                ) {
                    console.info("Using cached data:", file);
                    return parsed.data;
                }
            }
        } catch {
            // تجاهل الكاش غير الصالح
        }

        throw error;
    }
}


/* =========================================
   DATA CONVERSION
========================================= */

function convertMovies(data, category) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return [];
    }

    const result = [];

    Object.entries(data).forEach(([title, item]) => {
        if (!item || typeof item !== "object") {
            return;
        }

        result.push({
            id: "movie_" + category + "_" + title,
            title: title,
            category: category,
            poster: getPoster(item),
            description: safeDescription(item),
            mainLink: item.main_link || "",
            directVideo: item.direct_video || ""
        });
    });

    return result;
}


function convertSeries(data, category) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return [];
    }

    const result = [];

    Object.entries(data).forEach(([title, item]) => {
        if (!item || typeof item !== "object") {
            return;
        }

        const episodes = Array.isArray(item.episodes)
            ? item.episodes
            : [];

        result.push({
            id: "series_" + category + "_" + title,
            title: title,
            category: category,
            poster: getPoster(item),
            description: safeDescription(item),
            episodeCount: episodes.length,
            mainLink: item.main_link || ""
        });
    });

    return result;
}


/* =========================================
   LOAD MOVIES
========================================= */

async function loadMovies() {
    if (!elements.moviesGrid) {
        return;
    }

    elements.moviesGrid.innerHTML =
        '<div class="loading">جاري تحميل الأفلام...</div>';

    const categoryNames = {
        arabic: "عربي",
        foreign: "أجنبي",
        asian: "آسيوي",
        indian: "هندي",
        turkish: "تركي",
        animation: "أنيميشن"
    };

    const results = await Promise.allSettled(
        CONFIG.movieFiles.map(async function (file) {
            const data = await fetchJSON(file);

            const category = file
                .replace("movies_", "")
                .replace(".json", "");

            return convertMovies(
                data,
                categoryNames[category] || category
            );
        })
    );

    const movies = [];

    results.forEach(function (result) {
        if (result.status === "fulfilled") {
            movies.push(...result.value);
        } else {
            console.warn("تعذر تحميل ملف أفلام:", result.reason);
        }
    });

    const unique = new Map();

    movies.forEach(function (movie) {
        const key = normalizeText(movie.title);

        if (!unique.has(key)) {
            unique.set(key, movie);
        }
    });

    state.movies = Array.from(unique.values());

    if (elements.movieCount) {
        elements.movieCount.textContent = state.movies.length;
    }

    if (elements.moviesHeadingCount) {
        elements.moviesHeadingCount.textContent =
            state.movies.length + " فيلم";
    }

    state.filteredMovies = [...state.movies];

    if (state.movies.length === 0) {
        elements.moviesGrid.innerHTML =
            '<div class="error-state">تعذر تحميل الأفلام حالياً. حاول مرة ثانية.</div>';
        return;
    }

    renderMovies();
}


/* =========================================
   LOAD SERIES
========================================= */

async function loadSeries() {
    if (!elements.seriesGrid) {
        return;
    }

    elements.seriesGrid.innerHTML =
        '<div class="loading">جاري تحميل المسلسلات...</div>';

    const results = await Promise.allSettled(
        CONFIG.seriesFiles.map(async function (entry) {
            const data = await fetchJSON(entry.file);
            return convertSeries(data, entry.category);
        })
    );

    const allSeries = [];

    results.forEach(function (result) {
        if (result.status === "fulfilled") {
            allSeries.push(...result.value);
        } else {
            console.warn("تعذر تحميل قسم مسلسلات:", result.reason);
        }
    });

    const unique = new Map();

    allSeries.forEach(function (series) {
        const key = normalizeSeriesTitle(series.title);

        if (!key) {
            return;
        }

        const existing = unique.get(key);

        if (
            !existing ||
            series.episodeCount > existing.episodeCount
        ) {
            unique.set(key, series);
        }
    });

    state.series = Array.from(unique.values());
    state.filteredSeries = [...state.series];

    if (elements.seriesCount) {
        elements.seriesCount.textContent = state.series.length;
    }

    if (elements.seriesHeadingCount) {
        elements.seriesHeadingCount.textContent =
            state.series.length + " مسلسل";
    }

    if (state.series.length === 0) {
        elements.seriesGrid.innerHTML =
            '<div class="error-state">تعذر تحميل المسلسلات حالياً. حاول مرة ثانية.</div>';

        if (elements.seriesMore) {
            elements.seriesMore.hidden = true;
        }

        return;
    }

    renderSeries();
}


/* =========================================
   CARD CREATION
========================================= */

function createCard(item, type, index) {
    const poster = getPoster(item) || getPlaceholder();

    const title = escapeHTML(item.title);
    const category = escapeHTML(item.category);

    const subtitle = type === "series"
        ? (Number(item.episodeCount || 0) + " حلقة")
        : category;

    return `
        <article
            class="content-card"
            data-type="${type}"
            data-index="${index}"
            tabindex="0"
            role="button"
            aria-label="${title}"
        >
            <div class="poster-wrapper">

                <img
                    src="${escapeHTML(poster)}"
                    alt="${title}"
                    loading="lazy"
                    decoding="async"
                    onerror="this.onerror=null;this.src='${getPlaceholder()}'
                ">

                <span class="poster-badge">
                    ${type === "series" ? "مسلسل" : category}
                </span>

            </div>

            <div class="card-info">
                <h3>${title}</h3>
                <p>${escapeHTML(subtitle)}</p>
            </div>
        </article>
    `;
}


/* =========================================
   RENDER MOVIES
========================================= */

function renderMovies(append = false) {
    if (!elements.moviesGrid) {
        return;
    }

    const start = append
        ? (state.moviePage - 1) * CONFIG.itemsPerPage
        : 0;

    const end = state.moviePage * CONFIG.itemsPerPage;

    const visible = state.filteredMovies.slice(start, end);

    if (!append) {
        elements.moviesGrid.innerHTML = "";
    }

    if (state.filteredMovies.length === 0) {
        elements.moviesGrid.innerHTML =
            '<div class="empty-state">ما لقينا أفلام تطابق بحثك.</div>';

        if (elements.moviesMore) {
            elements.moviesMore.hidden = true;
        }

        return;
    }

    const html = visible.map(function (movie, index) {
        return createCard(movie, "movie", start + index);
    }).join("");

    elements.moviesGrid.insertAdjacentHTML("beforeend", html);

    if (elements.moviesMore) {
        elements.moviesMore.hidden =
            end >= state.filteredMovies.length;
    }
}


/* =========================================
   RENDER SERIES
========================================= */

function renderSeries(append = false) {
    if (!elements.seriesGrid) {
        return;
    }

    const start = append
        ? (state.seriesPage - 1) * CONFIG.itemsPerPage
        : 0;

    const end = state.seriesPage * CONFIG.itemsPerPage;

    const visible = state.filteredSeries.slice(start, end);

    if (!append) {
        elements.seriesGrid.innerHTML = "";
    }

    if (state.filteredSeries.length === 0) {
        elements.seriesGrid.innerHTML =
            '<div class="empty-state">ما لقينا مسلسلات تطابق بحثك.</div>';

        if (elements.seriesMore) {
            elements.seriesMore.hidden = true;
        }

        return;
    }

    const html = visible.map(function (series, index) {
        return createCard(series, "series", start + index);
    }).join("");

    elements.seriesGrid.insertAdjacentHTML("beforeend", html);

    if (elements.seriesMore) {
        elements.seriesMore.hidden =
            end >= state.filteredSeries.length;
    }
}


/* =========================================
   FILTER MOVIES
========================================= */

function filterMovies() {
    const query = normalizeText(state.searchQuery);

    state.filteredMovies = state.movies.filter(function (movie) {
        const matchesCategory =
            state.movieCategory === "الكل" ||
            movie.category === state.movieCategory;

        const matchesSearch =
            !query ||
            normalizeText(movie.title).includes(query);

        return matchesCategory && matchesSearch;
    });

    state.moviePage = 1;
    renderMovies();
}


/* =========================================
   FILTER SERIES
========================================= */

function filterSeries() {
    const query = normalizeText(state.searchQuery);

    state.filteredSeries = state.series.filter(function (series) {
        const matchesCategory =
            state.seriesCategory === "الكل" ||
            series.category === state.seriesCategory;

        const matchesSearch =
            !query ||
            normalizeText(series.title).includes(query);

        return matchesCategory && matchesSearch;
    });

    state.seriesPage = 1;
    renderSeries();
}


/* =========================================
   SEARCH ALL
========================================= */

function searchAll(value) {
    state.searchQuery = value || "";

    filterMovies();
    filterSeries();
}


/* =========================================
   LIVE SEARCH RESULTS
========================================= */

function ensureSearchResults() {
    if (!elements.searchContainer) {
        return null;
    }

    if (!elements.searchResults) {
        elements.searchResults = document.createElement("div");
        elements.searchResults.id = "searchResults";
        elements.searchResults.className = "search-results";
        elements.searchResults.setAttribute("aria-live", "polite");

        elements.searchContainer.appendChild(elements.searchResults);
    }

    return elements.searchResults;
}


function getSearchScore(item, query) {
    const title = normalizeText(item.title);
    const cleanTitle = normalizeSeriesTitle(item.title);

    if (title === query || cleanTitle === query) {
        return 100;
    }

    if (title.startsWith(query) || cleanTitle.startsWith(query)) {
        return 80;
    }

    if (title.includes(query) || cleanTitle.includes(query)) {
        return 60;
    }

    const words = query.split(" ").filter(Boolean);

    const matched = words.filter(word =>
        title.includes(word) || cleanTitle.includes(word)
    ).length;

    return words.length
        ? Math.round((matched / words.length) * 40)
        : 0;
}


function buildSearchResults(query) {
    if (!query) {
        return [];
    }

    const allItems = [
        ...state.movies.map(item => ({
            ...item,
            type: "movie"
        })),

        ...state.series.map(item => ({
            ...item,
            type: "series"
        }))
    ];

    return allItems
        .map(item => ({
            ...item,
            score: getSearchScore(item, query)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) =>
            b.score - a.score ||
            a.title.localeCompare(b.title, "ar")
        )
        .slice(0, CONFIG.maxSearchResults);
}


function renderSearchResults(value) {
    const panel = ensureSearchResults();

    if (!panel) {
        return;
    }

    const query = normalizeSeriesTitle(value);

    if (!query) {
        state.searchResults = [];

        panel.innerHTML =
            '<div class="search-hint">اكتب اسم فيلم أو مسلسل للبحث في المكتبة</div>';

        return;
    }

    state.searchResults = buildSearchResults(query);

    if (state.searchResults.length === 0) {
        panel.innerHTML = `
            <div class="search-empty">
                <strong>ما لقينا نتائج مطابقة</strong>
                <span>جرّب كتابة الاسم بشكل مختلف</span>
            </div>
        `;

        return;
    }

    const countText = state.searchResults.length === CONFIG.maxSearchResults
        ? "أبرز النتائج"
        : state.searchResults.length + " نتيجة";

    panel.innerHTML = `
        <div class="search-results-heading">
            <strong>نتائج البحث</strong>
            <span>${countText}</span>
        </div>

        <div class="search-results-grid">

            ${state.searchResults.map((item, index) => {
                const poster = getPoster(item) || getPlaceholder();

                const typeLabel =
                    item.type === "series" ? "مسلسل" : "فيلم";

                return `
                    <button
                        class="search-result-card"
                        type="button"
                        data-search-index="${index}"
                        aria-label="فتح ${escapeHTML(item.title)}"
                    >

                        <span class="search-result-poster">

                            <img
                                src="${escapeHTML(poster)}"
                                alt="${escapeHTML(item.title)}"
                                loading="lazy"
                                decoding="async"
                                onerror="this.onerror=null;this.src='${getPlaceholder()}'"
                            >

                            <span>${typeLabel}</span>

                        </span>

                        <span class="search-result-title">
                            ${escapeHTML(item.title)}
                        </span>

                        <span class="search-result-category">
                            ${escapeHTML(item.category)}
                        </span>

                    </button>
                `;
            }).join("")}

        </div>
    `;
}


function openSearchResult(index) {
    const item = state.searchResults[index];

    if (!item) {
        return;
    }

    openDetails(item, item.type);
}


/* =========================================
   SEARCH DESIGN
========================================= */

function injectSearchStyles() {
    if (document.getElementById("dramatv-search-styles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "dramatv-search-styles";

    style.textContent = `

        .search-container {
            position: relative;
        }

        .search-results {
            display: none;
            margin-top: 12px;
            padding: 15px;

            background: #111;
            border: 1px solid rgba(255,255,255,.09);
            border-radius: 15px;

            box-shadow: 0 18px 45px rgba(0,0,0,.45);

            max-height: min(65vh, 620px);
            overflow-y: auto;
        }

        .search-container.show .search-results {
            display: block;
        }

        .search-results-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;

            margin-bottom: 13px;

            color: #fff;
            font-size: 13px;
        }

        .search-results-heading span {
            color: #999;
            font-size: 11px;
        }

        .search-results-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 14px 11px;
        }

        .search-result-card {
            display: flex;
            flex-direction: column;
            min-width: 0;

            padding: 0;

            text-align: right;
            color: #fff;
            background: transparent;

            cursor: pointer;
        }

        .search-result-poster {
            position: relative;
            display: block;

            width: 100%;
            aspect-ratio: 2 / 3;

            overflow: hidden;

            border-radius: 9px;
            background: #202020;
            border: 1px solid rgba(255,255,255,.08);
        }

        .search-result-poster img {
            width: 100%;
            height: 100%;

            display: block;
            object-fit: cover;

            transition: transform .25s ease;
        }

        .search-result-card:hover .search-result-poster img {
            transform: scale(1.06);
        }

        .search-result-poster > span {
            position: absolute;
            top: 6px;
            right: 6px;

            padding: 3px 7px;

            border-radius: 5px;
            background: #e50914;

            color: #fff;
            font-size: 9px;
            font-weight: 800;
        }

        .search-result-title {
            margin-top: 7px;

            overflow: hidden;

            color: #eee;
            font-size: 11px;
            font-weight: 800;
            line-height: 1.7;

            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .search-result-category {
            margin-top: 2px;
            color: #888;
            font-size: 9px;
        }

        .search-hint,
        .search-empty {
            padding: 22px 10px;

            color: #999;
            text-align: center;
            font-size: 12px;
        }

        .search-empty {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .search-empty strong {
            color: #eee;
            font-size: 13px;
        }

        @media (max-width: 700px) {

            .search-results {
                padding: 11px;
                max-height: 60vh;
            }

            .search-results-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 13px 9px;
            }

            .search-result-title {
                font-size: 10px;
            }
        }

        @media (min-width: 701px) and (max-width: 950px) {

            .search-results-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
        }
    `;

    document.head.appendChild(style);
}


/* =========================================
   HERO SLIDER
========================================= */

function getHeroItems() {
    const combined = [];

    state.movies.forEach(function (movie) {
        if (movie.poster) {
            combined.push({
                title: movie.title,
                category: movie.category,
                poster: movie.poster,
                description: movie.description,
                type: "movie"
            });
        }
    });

    state.series.forEach(function (series) {
        if (series.poster) {
            combined.push({
                title: series.title,
                category: series.category,
                poster: series.poster,
                description: series.description,
                type: "series"
            });
        }
    });

    state.heroItems = combined.slice(0, CONFIG.maxHeroItems);

    renderHero();
}


function renderHero() {
    if (
        !elements.heroTitle ||
        !elements.heroDescription ||
        !elements.heroArt
    ) {
        return;
    }

    if (state.heroItems.length === 0) {
        return;
    }

    const item = state.heroItems[state.heroIndex];

    if (!item) {
        return;
    }

    const safePoster = safeImage(item.poster);

    elements.heroTitle.innerHTML =
        escapeHTML(item.title) +
        '<span>على DramaTV</span>';

    elements.heroDescription.textContent =
        item.description ||
        "اكتشف تفاصيل هذا العمل ضمن مكتبة DramaTV.";

    if (elements.heroLabel) {
        elements.heroLabel.textContent =
            (item.type === "series" ? "مسلسل" : "فيلم") +
            " • " + item.category;
    }

    // عرض صورة البانر كعنصر IMG مستقل حتى لا تتأثر بقيود background-image
    elements.heroArt.replaceChildren();

    elements.heroArt.style.backgroundImage =
        "linear-gradient(90deg, #080808 0%, rgba(8,8,8,.48) 52%, rgba(8,8,8,.08) 100%)";

    elements.heroArt.style.backgroundColor = "#080808";
    elements.heroArt.style.overflow = "hidden";

    if (safePoster) {
        const heroImage = document.createElement("img");

        heroImage.className = "dramatv-hero-image";
        heroImage.src = safePoster;
        heroImage.alt = item.title;
        heroImage.loading = "eager";
        heroImage.decoding = "async";
        heroImage.fetchPriority = "high";
        heroImage.draggable = false;

        heroImage.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;" +
            "display:block;object-fit:cover;object-position:center 25%;" +
            "opacity:1;z-index:0;pointer-events:none;";

        heroImage.onerror = function () {
            this.remove();
        };

        elements.heroArt.appendChild(heroImage);
    }

    // تدرج واضح فوق الصورة مع إبقاء النص مقروءاً
    const heroOverlay = elements.hero.querySelector(".hero-overlay");

    if (heroOverlay) {
        heroOverlay.style.background =
            "linear-gradient(90deg, #080808 0%, rgba(8,8,8,.90) 24%, " +
            "rgba(8,8,8,.48) 55%, rgba(8,8,8,.10) 100%)";

        heroOverlay.style.zIndex = "1";
    }

    if (elements.heroDots) {
        elements.heroDots.innerHTML = state.heroItems.map(function (_, index) {
            return `
                <button
                    class="hero-dot-button ${index === state.heroIndex ? "active" : ""}"
                    data-hero-index="${index}"
                    aria-label="انتقل إلى الشريحة ${index + 1}"
                ></button>
            `;
        }).join("");
    }
}


function changeHero(direction) {
    if (state.heroItems.length < 2) {
        return;
    }

    state.heroIndex =
        (state.heroIndex + direction + state.heroItems.length) %
        state.heroItems.length;

    renderHero();
    restartHeroTimer();
}


function restartHeroTimer() {
    if (state.heroTimer) {
        clearInterval(state.heroTimer);
        state.heroTimer = null;
    }

    if (state.heroItems.length < 2) {
        return;
    }

    state.heroTimer = setInterval(function () {
        state.heroIndex =
            (state.heroIndex + 1) % state.heroItems.length;

        renderHero();
    }, CONFIG.heroInterval);
}


function setupHero() {
    if (elements.heroPrevious) {
        elements.heroPrevious.addEventListener("click", function () {
            changeHero(-1);
        });
    }

    if (elements.heroNext) {
        elements.heroNext.addEventListener("click", function () {
            changeHero(1);
        });
    }

    if (elements.heroDots) {
        elements.heroDots.addEventListener("click", function (event) {
            const button = event.target.closest("[data-hero-index]");

            if (!button) {
                return;
            }

            const index = Number(button.dataset.heroIndex);

            if (
                Number.isInteger(index) &&
                index >= 0 &&
                index < state.heroItems.length
            ) {
                state.heroIndex = index;
                renderHero();
                restartHeroTimer();
            }
        });
    }
}


/* =========================================
   DETAILS PAGE
========================================= */

function openDetails(item, type) {
    if (!item || !item.title) {
        return;
    }

    const params = new URLSearchParams({
        type: type,
        title: item.title
    });

    window.location.href = "details.html?" + params.toString();
}


/* =========================================
   CARD EVENTS
========================================= */

function handleCardClick(event, type) {
    const card = event.target.closest(".content-card");

    if (!card || card.dataset.type !== type) {
        return;
    }

    const index = Number(card.dataset.index);

    if (!Number.isInteger(index)) {
        return;
    }

    if (type === "movie") {
        openDetails(state.filteredMovies[index], "movie");
    } else {
        openDetails(state.filteredSeries[index], "series");
    }
}


function handleCardKeyboard(event) {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    const card = event.target.closest(".content-card");

    if (!card) {
        return;
    }

    event.preventDefault();

    const index = Number(card.dataset.index);

    if (!Number.isInteger(index)) {
        return;
    }

    if (card.dataset.type === "movie") {
        openDetails(state.filteredMovies[index], "movie");
    } else {
        openDetails(state.filteredSeries[index], "series");
    }
}


/* =========================================
   FILTER BUTTONS
========================================= */

function setupMovieFilters() {
    if (!elements.movieFilters) {
        return;
    }

    elements.movieFilters.addEventListener("click", function (event) {
        const button = event.target.closest(".filter-button");

        if (!button) {
            return;
        }

        elements.movieFilters
            .querySelectorAll(".filter-button")
            .forEach(function (item) {
                item.classList.remove("active");
            });

        button.classList.add("active");

        state.movieCategory =
            button.dataset.category || "الكل";

        filterMovies();
    });
}


function setupSeriesFilters() {
    if (!elements.seriesFilters) {
        return;
    }

    elements.seriesFilters.addEventListener("click", function (event) {
        const button = event.target.closest(".filter-button");

        if (!button) {
            return;
        }

        elements.seriesFilters
            .querySelectorAll(".filter-button")
            .forEach(function (item) {
                item.classList.remove("active");
            });

        button.classList.add("active");

        state.seriesCategory =
            button.dataset.category || "الكل";

        filterSeries();
    });
}


/* =========================================
   EVENTS
========================================= */

function setupEvents() {

    injectSearchStyles();
    ensureSearchResults();

    if (
        elements.searchToggle &&
        elements.searchContainer &&
        elements.searchInput
    ) {
        elements.searchToggle.addEventListener("click", function () {

            elements.searchContainer.classList.toggle("show");

            if (elements.searchContainer.classList.contains("show")) {

                renderSearchResults(elements.searchInput.value);
                elements.searchInput.focus();

            } else {

                elements.searchInput.value = "";

                searchAll("");
                renderSearchResults("");
            }
        });
    }

    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", function (event) {

            searchAll(event.target.value);

            renderSearchResults(event.target.value);
        });
    }

    if (elements.searchResults) {
        elements.searchResults.addEventListener("click", function (event) {

            const card = event.target.closest("[data-search-index]");

            if (!card) {
                return;
            }

            const index = Number(card.dataset.searchIndex);

            if (Number.isInteger(index)) {
                openSearchResult(index);
            }
        });
    }

    setupMovieFilters();
    setupSeriesFilters();
    setupHero();

    if (elements.moviesMore) {
        elements.moviesMore.addEventListener("click", function () {
            state.moviePage++;
            renderMovies(true);
        });
    }

    if (elements.seriesMore) {
        elements.seriesMore.addEventListener("click", function () {
            state.seriesPage++;
            renderSeries(true);
        });
    }

    if (elements.moviesGrid) {
        elements.moviesGrid.addEventListener("click", function (event) {
            handleCardClick(event, "movie");
        });

        elements.moviesGrid.addEventListener("keydown", handleCardKeyboard);
    }

    if (elements.seriesGrid) {
        elements.seriesGrid.addEventListener("click", function (event) {
            handleCardClick(event, "series");
        });

        elements.seriesGrid.addEventListener("keydown", handleCardKeyboard);
    }

    if (elements.modalClose) {
        elements.modalClose.addEventListener("click", closeDetails);
    }

    if (elements.modalBackdrop) {
        elements.modalBackdrop.addEventListener("click", closeDetails);
    }

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {

            closeDetails();

            if (
                elements.searchContainer &&
                elements.searchContainer.classList.contains("show")
            ) {
                elements.searchContainer.classList.remove("show");

                if (elements.searchInput) {
                    elements.searchInput.value = "";
                }

                searchAll("");
                renderSearchResults("");
            }
        }
    });

    if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
    }
}


/* =========================================
   CLOSE DETAILS MODAL
========================================= */

function closeDetails() {
    if (!elements.modal) {
        return;
    }

    elements.modal.classList.remove("show");
    document.body.style.overflow = "";
}


/* =========================================
   INITIALIZATION
========================================= */

async function initializeDramaTV() {

    if (state.initialized) {
        return;
    }

    state.initialized = true;

    setupEvents();

    await Promise.allSettled([
        loadMovies(),
        loadSeries()
    ]);

    getHeroItems();
    restartHeroTimer();

    // إذا المستخدم كتب أثناء تحميل البيانات،
    // نحدّث النتائج بعد اكتمال التحميل.
    if (elements.searchInput && elements.searchInput.value.trim()) {
        renderSearchResults(elements.searchInput.value);
    }

    console.log("DramaTV initialized successfully");
}


document.addEventListener(
    "DOMContentLoaded",
    initializeDramaTV
);
