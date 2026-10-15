
"use strict";

/* =========================================
   DRAMATV - GITHUB DATA CONNECTION
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

    cacheDuration: 5 * 60 * 1000,
    itemsPerPage: 18
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
    searchQuery: "",

    moviePage: 1,
    seriesPage: 1,

    loading: false
};


/* =========================================
   DOM ELEMENTS
========================================= */

const elements = {
    moviesGrid: document.getElementById("moviesGrid"),
    seriesGrid: document.getElementById("seriesGrid"),

    movieFilters: document.getElementById("movieFilters"),

    movieCount: document.getElementById("movieCount"),
    seriesCount: document.getElementById("seriesCount"),

    moviesHeadingCount: document.getElementById("moviesHeadingCount"),
    seriesHeadingCount: document.getElementById("seriesHeadingCount"),

    moviesMore: document.getElementById("moviesMore"),
    seriesMore: document.getElementById("seriesMore"),

    searchToggle: document.getElementById("searchToggle"),
    searchContainer: document.getElementById("searchContainer"),
    searchInput: document.getElementById("searchInput"),

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
        .toLowerCase();
}


function normalizeSeriesTitle(value) {
    return normalizeText(value)
        .replace(/^مسلسل\s*/i, "")
        .replace(/[ـًٌٍَُِّْ]/g, "")
        .replace(/\s+/g, " ")
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
            '<text x="50%" y="50%" fill="#555" font-size="25" ' +
            'font-family="Arial" text-anchor="middle" dominant-baseline="middle">' +
            'DramaTV</text></svg>'
        );
}


function getCacheKey(file) {
    return "dramatv_web_" + file;
}


/* =========================================
   GITHUB FETCH
========================================= */

async function fetchJSON(file) {

    const cacheKey = getCacheKey(file);

    try {

        const response = await fetch(
            CONFIG.baseUrl + encodeURIComponent(file) +
            "?v=" + Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                "GitHub HTTP " + response.status + ": " + file
            );
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

        console.warn("GitHub fetch failed:", file, error);

        try {

            const cached = localStorage.getItem(cacheKey);

            if (cached) {

                const parsed = JSON.parse(cached);

                if (
                    parsed &&
                    parsed.data &&
                    Date.now() - parsed.time < 7 * 24 * 60 * 60 * 1000
                ) {
                    return parsed.data;
                }
            }

        } catch {
            // تجاهل بيانات التخزين غير الصالحة
        }

        throw error;
    }
}


/* =========================================
   DATA CONVERSION
========================================= */

function convertMovies(data, category) {

    if (!data || typeof data !== "object") {
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

            description: item.description || item.overview || "",

            mainLink: item.main_link || ""
        });
    });

    return result;
}


function convertSeries(data, category) {

    if (!data || typeof data !== "object") {
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

            description: item.description || item.overview || "",

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

    elements.moviesGrid.innerHTML =
        '<div class="loading">جاري تحميل الأفلام...</div>';

    const results = await Promise.allSettled(
        CONFIG.movieFiles.map(async function (file) {

            const data = await fetchJSON(file);

            const category = file
                .replace("movies_", "")
                .replace(".json", "");

            const categoryNames = {
                arabic: "عربي",
                foreign: "أجنبي",
                asian: "آسيوي",
                indian: "هندي",
                turkish: "تركي",
                animation: "أنيميشن"
            };

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
            console.warn("تعذر تحميل أحد أقسام الأفلام");
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

    if (state.movies.length === 0) {

        elements.moviesGrid.innerHTML =
            '<div class="error-state">تعذر تحميل الأفلام حالياً. تحقق من اتصال الإنترنت أو ملفات البيانات.</div>';

        return;
    }

    state.filteredMovies = [...state.movies];

    elements.movieCount.textContent = state.movies.length;

    elements.moviesHeadingCount.textContent =
        state.movies.length + " فيلم";

    renderMovies();
}


/* =========================================
   LOAD ALL SERIES SECTIONS
========================================= */

async function loadSeries() {

    elements.seriesGrid.innerHTML =
        '<div class="loading">جاري تحميل جميع المسلسلات...</div>';

    const requests = CONFIG.seriesFiles.map(async function (entry) {

        const data = await fetchJSON(entry.file);

        return convertSeries(data, entry.category);
    });

    const results = await Promise.allSettled(requests);

    const allSeries = [];

    results.forEach(function (result) {

        if (result.status === "fulfilled") {

            allSeries.push(...result.value);

        } else {

            console.warn(
                "تعذر تحميل أحد أقسام المسلسلات:",
                result.reason
            );
        }
    });


    /* إزالة التكرار */

    const unique = new Map();

    allSeries.forEach(function (series) {

        const key = normalizeSeriesTitle(series.title);

        if (!key) {
            return;
        }

        const existing = unique.get(key);

        // الاحتفاظ بالنسخة التي تحتوي معلومات حلقات أكثر.
        if (
            !existing ||
            series.episodeCount > existing.episodeCount
        ) {
            unique.set(key, series);
        }
    });


    state.series = Array.from(unique.values());

    state.filteredSeries = [...state.series];


    /* تحديث الأعداد */

    if (elements.seriesCount) {
        elements.seriesCount.textContent = state.series.length;
    }

    if (elements.seriesHeadingCount) {

        elements.seriesHeadingCount.textContent =
            state.series.length + " مسلسل";
    }


    /* حالة عدم وجود بيانات */

    if (state.series.length === 0) {

        elements.seriesGrid.innerHTML =
            '<div class="error-state">تعذر تحميل المسلسلات حالياً. تحقق من ملفات الأقسام واتصال الإنترنت.</div>';

        if (elements.seriesMore) {
            elements.seriesMore.hidden = true;
        }

        return;
    }


    console.log(
        "DramaTV series loaded:",
        state.series.length
    );

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
        ? (item.episodeCount + " حلقة")
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
                    onerror="this.onerror=null;this.src='${getPlaceholder()}'"
                >

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

        const globalIndex = start + index;

        return createCard(movie, "movie", globalIndex);

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

        const globalIndex = start + index;

        return createCard(series, "series", globalIndex);

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
   SEARCH
========================================= */

function searchAll(value) {

    state.searchQuery = value || "";

    filterMovies();

    const query = normalizeText(state.searchQuery);

    state.filteredSeries = state.series.filter(function (series) {

        return normalizeText(series.title).includes(query);
    });

    state.seriesPage = 1;

    renderSeries();
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


function closeDetails() {

    if (!elements.modal) {
        return;
    }

    elements.modal.classList.remove("show");

    document.body.style.overflow = "";
}


/* =========================================
   EVENT LISTENERS
========================================= */

function setupEvents() {

    if (elements.searchToggle && elements.searchContainer && elements.searchInput) {

        elements.searchToggle.addEventListener("click", function () {

            elements.searchContainer.classList.toggle("show");

            if (elements.searchContainer.classList.contains("show")) {

                elements.searchInput.focus();

            } else {

                elements.searchInput.value = "";

                searchAll("");
            }
        });
    }


    if (elements.searchInput) {

        elements.searchInput.addEventListener("input", function (event) {

            searchAll(event.target.value);
        });
    }


    if (elements.movieFilters) {

        elements.movieFilters.addEventListener("click", function (event) {

            const button = event.target.closest(".filter-button");

            if (!button) {
                return;
            }

            document.querySelectorAll(".filter-button").forEach(function (item) {

                item.classList.remove("active");
            });

            button.classList.add("active");

            state.movieCategory = button.dataset.category || "الكل";

            filterMovies();
        });
    }


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

            const card = event.target.closest(".content-card");

            if (!card) {
                return;
            }

            const index = Number(card.dataset.index);

            openDetails(state.filteredMovies[index], "movie");
        });
    }


    if (elements.seriesGrid) {

        elements.seriesGrid.addEventListener("click", function (event) {

            const card = event.target.closest(".content-card");

            if (!card) {
                return;
            }

            const index = Number(card.dataset.index);

            openDetails(state.filteredSeries[index], "series");
        });
    }


    function handleKeyboard(event) {

        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        const card = event.target.closest(".content-card");

        if (!card) {
            return;
        }

        event.preventDefault();

        const index = Number(card.dataset.index);

        if (card.dataset.type === "movie") {

            openDetails(state.filteredMovies[index], "movie");

        } else {

            openDetails(state.filteredSeries[index], "series");
        }
    }


    if (elements.moviesGrid) {
        elements.moviesGrid.addEventListener("keydown", handleKeyboard);
    }

    if (elements.seriesGrid) {
        elements.seriesGrid.addEventListener("keydown", handleKeyboard);
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
        }
    });


    if (elements.currentYear) {

        elements.currentYear.textContent =
            new Date().getFullYear();
    }
}


/* =========================================
   INITIALIZATION
========================================= */

async function initializeDramaTV() {

    setupEvents();

    await Promise.allSettled([
        loadMovies(),
        loadSeries()
    ]);

    console.log("DramaTV website initialized");
}


document.addEventListener(
    "DOMContentLoaded",
    initializeDramaTV
);
