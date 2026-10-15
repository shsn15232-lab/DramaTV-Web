"use strict";

/* =========================================
   DRAMATV - RECENTLY ADDED
========================================= */

(function () {
    const BASE =
        "https://raw.githubusercontent.com/shsn15232-lab/DramaTV-Data/main/";

    const MOVIES = [
        { file: "movies_arabic.json", category: "عربي" },
        { file: "movies_foreign.json", category: "أجنبي" },
        { file: "movies_asian.json", category: "آسيوي" },
        { file: "movies_indian.json", category: "هندي" },
        { file: "movies_turkish.json", category: "تركي" },
        { file: "movies_animation.json", category: "أنيميشن" }
    ];

    const SERIES = [
        { file: "section_arabic.json", category: "عربي" },
        { file: "section_asian.json", category: "آسيوي" },
        { file: "section_dubbed.json", category: "مدبلج" },
        { file: "section_foreign.json", category: "أجنبي" },
        { file: "section_ramadan_2026.json", category: "رمضان 2026" },
        { file: "section_short.json", category: "قصير" },
        { file: "section_turkish.json", category: "تركي" }
    ];

    const LIMIT = 12;

    function escapeHTML(value) {
        return String(value || "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function safePoster(item) {
        const url =
            item.poster ||
            item.posterUrl ||
            item.thumbnail ||
            item.image ||
            "";

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

    function getUploadDate(url) {
        const match = String(url || "").match(
            /\/uploads\/(\d{4})\/(\d{2})\//
        );

        if (!match) return 0;

        return Number(match[1] + match[2]);
    }

    function getPlaceholder() {
        return "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">' +
                '<rect width="100%" height="100%" fill="#181818"/>' +
                '<text x="50%" y="50%" fill="#888" font-size="25" ' +
                'font-family="Arial" text-anchor="middle" ' +
                'dominant-baseline="middle">DramaTV</text></svg>'
            );
    }

    async function fetchFile(file) {
        const response = await fetch(
            BASE + encodeURIComponent(file) + "?v=" + Date.now(),
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Failed: " + file);
        }

        return response.json();
    }

    async function loadFile(entry, type, fileIndex) {
        const data = await fetchFile(entry.file);

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return [];
        }

        const entries = Object.entries(data);

        return entries.map(([title, item], index) => {
            if (!item || typeof item !== "object") return null;

            const poster = safePoster(item);

            return {
                title,
                type,
                category: entry.category,
                poster,
                url:
                    "details.html?type=" + type +
                    "&title=" + encodeURIComponent(title),

                uploadDate: getUploadDate(poster),

                // ترتيب عكسي داخل ملف البيانات
                order: fileIndex * 100000 + (entries.length - index)
            };
        }).filter(Boolean);
    }

    function injectStyles() {
        if (document.getElementById("dt-recent-styles")) return;

        const style = document.createElement("style");
        style.id = "dt-recent-styles";

        style.textContent = `
            .dt-recent-section {
                padding: 28px 6%;
                max-width: 1500px;
                margin: 0 auto;
            }

            .dt-recent-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 18px;
            }

            .dt-recent-heading h2 {
                color: #fff;
                font-size: 21px;
                font-weight: 900;
                margin: 0;
            }

            .dt-recent-heading span {
                color: #999;
                font-size: 11px;
            }

            .dt-recent-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 15px;
            }

            .dt-recent-card {
                min-width: 0;
                color: #fff;
                text-decoration: none;
                display: block;
                position: relative;
                transition: transform .22s ease;
            }

            .dt-recent-card:hover {
                transform: translateY(-5px);
            }

            .dt-recent-poster {
                position: relative;
                overflow: hidden;
                border-radius: 11px;
                background: #181818;
                border: 1px solid #292929;
            }

            .dt-recent-poster img {
                display: block;
                width: 100%;
                aspect-ratio: 2 / 3;
                object-fit: cover;
                transition: transform .35s ease;
            }

            .dt-recent-card:hover img {
                transform: scale(1.045);
            }

            .dt-recent-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 5px 9px;
                border-radius: 6px;
                background: #e50914;
                color: #fff;
                font-size: 10px;
                font-weight: 800;
                z-index: 2;
            }

            .dt-recent-type {
                position: absolute;
                bottom: 8px;
                right: 8px;
                padding: 4px 8px;
                border-radius: 5px;
                background: #080808d9;
                color: #fff;
                font-size: 10px;
                z-index: 2;
            }

            .dt-recent-card strong {
                display: block;
                color: #fff;
                font-size: 11px;
                line-height: 1.8;
                margin-top: 7px;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .dt-recent-card small {
                color: #999;
                font-size: 10px;
            }

            .dt-recent-empty {
                grid-column: 1 / -1;
                padding: 22px;
                text-align: center;
                background: #141414;
                color: #999;
                border: 1px solid #292929;
                border-radius: 12px;
                font-size: 12px;
            }

            @media(max-width: 700px) {
                .dt-recent-section {
                    padding: 22px 5%;
                }

                .dt-recent-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 13px 9px;
                }

                .dt-recent-heading h2 {
                    font-size: 18px;
                }
            }

            @media(min-width: 701px) and (max-width: 950px) {
                .dt-recent-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createSection() {
        if (document.getElementById("dt-recent")) return;

        const movies = document.getElementById("movies");
        if (!movies) return;

        const section = document.createElement("section");

        section.id = "dt-recent";
        section.className = "dt-recent-section";

        section.innerHTML = `
            <div class="dt-recent-heading">
                <h2>🆕 أضيف حديثاً</h2>
                <span>أحدث الأعمال على DramaTV</span>
            </div>

            <div class="dt-recent-grid">
                <div class="dt-recent-empty">
                    جاري تحميل أحدث الأعمال...
                </div>
            </div>
        `;

        movies.parentNode.insertBefore(section, movies);
    }

    function render(items) {
        const section = document.getElementById("dt-recent");
        if (!section) return;

        const grid = section.querySelector(".dt-recent-grid");

        if (!items.length) {
            grid.innerHTML = `
                <div class="dt-recent-empty">
                    لا توجد أعمال متاحة حالياً.
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => {
            const poster = item.poster || getPlaceholder();

            return `
                <a class="dt-recent-card"
                   href="${escapeHTML(item.url)}">

                    <div class="dt-recent-poster">

                        <span class="dt-recent-badge">جديد</span>

                        <span class="dt-recent-type">
                            ${item.type === "series" ? "مسلسل" : "فيلم"}
                        </span>

                        <img
                            src="${escapeHTML(poster)}"
                            alt="${escapeHTML(item.title)}"
                            loading="lazy"
                            decoding="async"
                            onerror="this.onerror=null;this.src='${getPlaceholder()}'"
                        >

                    </div>

                    <strong>${escapeHTML(item.title)}</strong>

                    <small>${escapeHTML(item.category)}</small>

                </a>
            `;
        }).join("");
    }

    async function init() {
        injectStyles();
        createSection();

        const tasks = [
            ...MOVIES.map((entry, index) =>
                loadFile(entry, "movie", index)
            ),

            ...SERIES.map((entry, index) =>
                loadFile(entry, "series", MOVIES.length + index)
            )
        ];

        const results = await Promise.allSettled(tasks);

        let allItems = [];

        results.forEach(result => {
            if (result.status === "fulfilled") {
                allItems.push(...result.value);
            } else {
                console.warn("DramaTV recent:", result.reason);
            }
        });

        // إزالة التكرار حسب نوع العمل واسمه
        const unique = new Map();

        allItems.forEach(item => {
            const key =
                item.type + "::" +
                item.title.trim().toLowerCase();

            if (!unique.has(key)) {
                unique.set(key, item);
            }
        });

        allItems = Array.from(unique.values());

        // ترتيب حسب تاريخ رفع البوستر، ثم ترتيب البيانات
        allItems.sort((a, b) => {
            if (a.uploadDate !== b.uploadDate) {
                return b.uploadDate - a.uploadDate;
            }

            return b.order - a.order;
        });

        render(allItems.slice(0, LIMIT));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
