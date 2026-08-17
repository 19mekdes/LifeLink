console.log("Donor JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // BASIC ELEMENT HELPERS
    // ==========================================

    const $ = (id) => document.getElementById(id);


    // ==========================================
    // DASHBOARD ELEMENTS
    // ==========================================

    const dashboardDonorName = $("dashboardDonorName");
    const topbarName = $("topbarName");

    const profileInitial = $("profileInitial");
    const dashboardProfileInitial = $("dashboardProfileInitial");

    const totalDonations = $("totalDonations");
    const totalRequests = $("totalRequests");
    const lastDonation = $("lastDonation");

    const dashboardBloodType = $("dashboardBloodType");
    const dashboardLocation = $("dashboardLocation");
    const dashboardAvailability = $("dashboardAvailability");

    const donationStatus = $("donationStatus");
    const donationStatusMessage = $("donationStatusMessage");

    const notificationCount = $("notificationCount");
    const topNotificationCount = $("topNotificationCount");

    const recentActivity = $("recentActivity");
    const notificationPreview = $("notificationPreview");


    // ==========================================
    // DISPLAY DONOR INFORMATION
    // ==========================================

    function displayDonorInfo(donor) {

        if (!donor) return;


        // Name

        const name =
            donor.name ||
            donor.fullName ||
            "Donor";

        if (dashboardDonorName) {
            dashboardDonorName.textContent = name;
        }

        if (topbarName) {
            topbarName.textContent = name;
        }


        // Initial

        const initial =
            name.charAt(0).toUpperCase();

        if (profileInitial) {
            profileInitial.textContent = initial;
        }

        if (dashboardProfileInitial) {
            dashboardProfileInitial.textContent = initial;
        }


        // Blood type

        if (dashboardBloodType) {
            dashboardBloodType.textContent =
                donor.bloodType || "Not available";
        }


        // Location

        if (dashboardLocation) {
            dashboardLocation.textContent =
                donor.location || "Not available";
        }


        // Availability

        const availability =
            donor.availability ||
            donor.status ||
            "Not available";

        if (dashboardAvailability) {
            dashboardAvailability.textContent =
                availability;
        }


        // Donation status

        if (donationStatus) {
            donationStatus.textContent =
                availability === "Available"
                    ? "Available to Donate"
                    : availability;
        }

        if (donationStatusMessage) {

            if (availability === "Available") {

                donationStatusMessage.textContent =
                    "Your donation can help someone in need.";

            } else {

                donationStatusMessage.textContent =
                    "Your current availability status is shown above.";

            }
        }
    }


    // ==========================================
    // LOAD DASHBOARD
    // ==========================================

    async function loadDashboardData() {

        try {

            const data =
                await apiRequest("/api/donors/dashboard");

            console.log("Dashboard data:", data);

            /*
             * We are intentionally not guessing the backend
             * response structure yet.
             *
             * Once your backend teammate starts the server,
             * we'll inspect the actual response and map it here.
             */

            const donor =
                data.donor ||
                data.profile ||
                data;

            displayDonorInfo(donor);


            // Recent activity

            if (recentActivity) {

                if (data.recentActivity) {

                    recentActivity.innerHTML = `
                        <p>
                            ${data.recentActivity}
                        </p>
                    `;

                } else {

                    recentActivity.innerHTML = `
                        <p>
                            No recent activity available.
                        </p>
                    `;
                }
            }


        } catch (error) {

            console.error(
                "Failed to load dashboard:",
                error
            );

        }
    }


    // ==========================================
    // LOAD DONOR STATISTICS
    // ==========================================

    async function loadDonorStats() {

        try {

            const stats =
                await apiRequest("/api/donors/stats");

            console.log("Donor stats:", stats);


            /*
             * Again, we don't guess the exact field names.
             * We'll map them after seeing the real backend
             * response.
             */


            if (totalDonations) {

                totalDonations.textContent =
                    stats.totalDonations ??
                    stats.donations ??
                    0;
            }


            if (totalRequests) {

                totalRequests.textContent =
                    stats.totalRequests ??
                    stats.requests ??
                    0;
            }


            if (lastDonation) {

                lastDonation.textContent =
                    stats.lastDonation ??
                    "No donations yet";
            }


        } catch (error) {

            console.error(
                "Failed to load donor stats:",
                error
            );

        }
    }


    // ==========================================
    // LOAD NOTIFICATION COUNT
    // ==========================================

    async function loadNotificationCount() {

        try {

            const notifications =
                await apiRequest(
                    "/api/donors/notifications"
                );

            console.log(
                "Notifications:",
                notifications
            );


            /*
             * This is intentionally flexible until we see
             * the backend response structure.
             */

            const list =
                Array.isArray(notifications)
                    ? notifications
                    : notifications.notifications || [];


            const unreadCount =
                list.filter(
                    notification =>
                        !notification.read &&
                        !notification.isRead
                ).length;


            if (notificationCount) {
                notificationCount.textContent =
                    unreadCount;
            }

            if (topNotificationCount) {
                topNotificationCount.textContent =
                    unreadCount;
            }


            // Notification preview

            if (notificationPreview) {

                if (!list.length) {

                    notificationPreview.innerHTML = `
                        <p>
                            No new notifications.
                        </p>
                    `;

                } else {

                    const latest =
                        list.slice(0, 3);

                    notificationPreview.innerHTML =
                        latest.map(notification => {

                            return `
                                <div class="notification-item">
                                    <strong>
                                        ${notification.title || "Notification"}
                                    </strong>

                                    <p>
                                        ${notification.message || ""}
                                    </p>
                                </div>
                            `;

                        }).join("");
                }
            }


        } catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );

        }
    }


    // ==========================================
    // SIDEBAR NAVIGATION
    // ==========================================

    document
        .querySelectorAll(".sidebar nav a")
        .forEach(link => {

            link.addEventListener("click", () => {

                document
                    .querySelectorAll(".sidebar nav a")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                link.classList.add("active");
            });

        });


    // ==========================================
    // LOGOUT
    // ==========================================

    document
        .querySelector(".logout")
        ?.addEventListener("click", event => {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );

            if (!confirmed) {
                event.preventDefault();
            }

        });


    // ==========================================
    // START DASHBOARD
    // ==========================================

    loadDashboardData();
    loadDonorStats();
    loadNotificationCount();

});