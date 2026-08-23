const API_BASE_URL = "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `API Error ${response.status}: ${errorText}`
        );
    }

    return response.json();
}

const api = {
    get: (endpoint) =>
        apiRequest(endpoint, {
            method: "GET"
        }),

    post: (endpoint, data) =>
        apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(data)
        }),

    put: (endpoint, data) =>
        apiRequest(endpoint, {
            method: "PUT",
            body: JSON.stringify(data)
        }),

    delete: (endpoint) =>
        apiRequest(endpoint, {
            method: "DELETE"
        })
};