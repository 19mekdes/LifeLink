const API_BASE_URL = window.API_BASE_URL || window.API_URL ||
  (window.location.port === '5500' || window.location.port === '5001' || window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : '/api');

/* =====================================================
   API REQUEST HELPER
===================================================== */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(
            data?.message || data?.error || `API Error ${response.status}: ${data}`
        );
    }

    return data;
}

/* =====================================================
   API OBJECT
===================================================== */
const api = {
    get: (endpoint, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: "GET"
        }),

    post: (endpoint, data = {}, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: "POST",
            body: JSON.stringify(data)
        }),

    put: (endpoint, data = {}, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: "PUT",
            body: JSON.stringify(data)
        }),

    delete: (endpoint, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: "DELETE"
        }),

    /* =================================================
       AUTH STORAGE & HELPERS
    ================================================= */
    saveAuth(token, user) {
        localStorage.setItem("token", token);
        localStorage.setItem("auth_token", token);
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
    },

    clearAuth() {
        localStorage.removeItem("token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("lifelinkDonor");
    },

    isAuthenticated() {
        return !!(localStorage.getItem("token") || localStorage.getItem("auth_token"));
    },

    getUser() {
        try {
            const user = localStorage.getItem("user");
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error("Could not read user:", error);
            return null;
        }
    },

    getDashboardUrl(role) {
        const dashboards = {
            ADMIN: "admin-dashboard.html",
            BLOOD_BANK: "bloodbank-dashboard.html",
            HOSPITAL: "hospital-dashboard.html",
            DONOR: "donor-dashboard.html"
        };
        return dashboards[role] || "login.html";
    },

    logout() {
        this.clearAuth();
        window.location.href = "login.html";
    }
};

/* =====================================================
   GLOBAL & MODULE EXPORTS
===================================================== */
if (typeof window !== "undefined") {
    window.apiRequest = apiRequest;
    window.api = api;
}

export default api;