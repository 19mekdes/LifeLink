const API_BASE_URL = "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",

                ...(token
                    ? {
                        Authorization: `Bearer ${token}`
                    }
                    : {}),

                ...(options.headers || {})
            }
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    const data =
        contentType.includes("application/json")
            ? await response.json()
            : await response.text();

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `API Error ${response.status}`
        );
    }

    return data;
}

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

    saveAuth(token, user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
    },

    clearAuth() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    isAuthenticated() {
        return !!localStorage.getItem("token");
    },

    getUser() {
        try {
            const user = localStorage.getItem("user");

            return user
                ? JSON.parse(user)
                : null;

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

        localStorage.removeItem("lifelinkDonor");

        window.location.href = "login.html";
    }
};


window.apiRequest = apiRequest;
window.api = api;

export default api;

console.log("API JS loaded successfully:", window.api);