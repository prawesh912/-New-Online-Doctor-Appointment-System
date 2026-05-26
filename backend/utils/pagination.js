export function getPaginationParams(query) {
    const limit = parseInt(query.limit) || 10;
    const page = parseInt(query.page) || 1;
    const offset = (page > 0 ? page - 1 : 0) * limit;
    return { limit, page, offset };
}

export function paginatedResponse({ total, page, limit, items, key = "data", extra = {} }) {
    const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
    return {
        success: true,
        total_data: total,
        total_pages,
        current_page: total > 0 ? page : 0,
        has_next_page: page < total_pages,
        count: items.length,
        [key]: items,
        ...extra,
    };
}

/** Local calendar date YYYY-MM-DD (avoids UTC off-by-one for token/status). */
export function getTodayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Defaults start_date and end_date to today (YYYY-MM-DD). */
export function getDateRange(query) {
    const today = getTodayLocal();
    return {
        start_date: query.start_date || today,
        end_date: query.end_date || today,
    };
}

/** Optional date range — no filter unless query params are provided. */
export function getOptionalDateRange(query) {
    return {
        start_date: query.start_date || null,
        end_date: query.end_date || null,
    };
}
