import api from './api/api.js';

console.log("Donor Notifications JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    const notificationList =
        document.getElementById("notificationList");

    const notificationCount =
        document.getElementById("notificationCount");

    const markAllReadBtn =
        document.getElementById("markAllReadBtn");


    // ==========================================
    // LOAD NOTIFICATIONS
    // ==========================================

    async function loadNotifications() {

        try {

            const data =
                await apiRequest(
                    "/donors/notifications"
                );

            console.log(
                "Notifications:",
                data
            );


            const notifications =
                data?.data?.notifications || [];


            updateNotificationCount(
                notifications
            );


            displayNotifications(
                notifications
            );


        } catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );


            if (notificationList) {

                notificationList.innerHTML = `
                    <p>
                        Unable to load notifications.
                    </p>
                `;
            }
        }
    }


    // ==========================================
    // DISPLAY NOTIFICATIONS
    // ==========================================

    function displayNotifications(
        notifications
    ) {

        if (!notificationList) return;


        if (!notifications.length) {

            notificationList.innerHTML = `
                <p>
                    No notifications available.
                </p>
            `;

            return;
        }


        notificationList.innerHTML =
            notifications.map(notification => {

                const id =
                    notification.id ||
                    notification.notificationId ||
                    notification._id;


                const title =
                    notification.title ||
                    "Notification";


                const message =
                    notification.message ||
                    notification.description ||
                    "";


                const date =
                    notification.date ||
                    notification.createdAt ||
                    "";


                const isRead =
                    notification.read ||
                    notification.isRead;


                return `
                    <div
                        class="notification-item
                        ${isRead ? "read" : "unread"}"
                    >

                        <div>

                            <strong>
                                ${title}
                            </strong>

                            <p>
                                ${message}
                            </p>

                            <small>
                                ${date}
                            </small>

                        </div>

                        ${!isRead
                        ? `
                                    <button
                                        class="mark-read-btn"
                                        data-id="${id}">
                                        Mark as Read
                                    </button>
                                  `
                        : `
                                    <span>
                                        Read
                                    </span>
                                  `
                    }

                    </div>
                `;

            }).join("");


        // Attach mark-as-read buttons

        document
            .querySelectorAll(".mark-read-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;

                        markAsRead(
                            id,
                            button
                        );
                    }
                );

            });
    }


    // ==========================================
    // UPDATE UNREAD COUNT
    // ==========================================

    function updateNotificationCount(
        notifications
    ) {

        const unread =
            notifications.filter(
                notification =>
                    !notification.read &&
                    !notification.isRead
            ).length;


        if (notificationCount) {

            notificationCount.textContent =
                unread;
        }
    }


    // ==========================================
    // MARK ONE AS READ
    // ==========================================

    async function markAsRead(
        notificationId,
        button
    ) {

        if (!notificationId) {

            console.error(
                "Notification ID is missing."
            );

            return;
        }


        try {

            button.disabled = true;

            button.textContent =
                "Updating...";


            const result =
                await apiRequest(
                    `/donors/notifications/${notificationId}/read`,
                    {
                        method: "PUT"
                    }
                );

            console.log(
                "Notification marked as read:",
                result
            );


            await loadNotifications();


        } catch (error) {

            console.error(
                "Failed to mark notification as read:",
                error
            );


            button.disabled = false;

            button.textContent =
                "Mark as Read";


            alert(
                "Unable to update notification."
            );
        }
    }


    // ==========================================
    // MARK ALL AS READ
    // ==========================================

    markAllReadBtn?.addEventListener(
        "click",
        async () => {

            try {

                markAllReadBtn.disabled =
                    true;

                markAllReadBtn.textContent =
                    "Updating...";


                const result =
                    await apiRequest(
                        "/donors/notifications/read-all",
                        {
                            method: "PUT"
                        }
                    );


                console.log(
                    "All notifications marked as read:",
                    result
                );


                await loadNotifications();


            } catch (error) {

                console.error(
                    "Failed to mark all notifications as read:",
                    error
                );


                alert(
                    "Unable to update notifications."
                );


            } finally {

                markAllReadBtn.disabled =
                    false;

                markAllReadBtn.textContent =
                    "Mark All as Read";
            }
        }
    );


    // ==========================================
    // START
    // ==========================================

    loadNotifications();

});