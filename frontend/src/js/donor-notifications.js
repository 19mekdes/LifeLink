const API_BASE_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", function () {
    loadNotifications();

    document.getElementById("markAllRead")
        .addEventListener("click", markAllRead);
});

async function loadNotifications() {
    try {
        const response = await fetch(
            API_BASE_URL + "/api/donors/notifications"
        );

        if (!response.ok) {
            throw new Error("Failed to load notifications");
        }

        const data = await response.json();

        console.log("Notifications:", data);

    } catch (error) {
        console.error("Notification error:", error);
    }
}

async function markAllRead() {
    try {
        const response = await fetch(
            API_BASE_URL + "/api/donors/notifications/read-all",
            {
                method: "PUT"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to mark notifications as read");
        }

        loadNotifications();

    } catch (error) {
        console.error("Mark all read error:", error);
    }
}