const API_BASE_URL = window.API_BASE_URL || "http://localhost:5001";

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
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