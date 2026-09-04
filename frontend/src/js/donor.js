import api from "./api/api.js";

console.log("Donor JS is working!");

document.addEventListener("DOMContentLoaded", () => {

const $ = (id) => document.getElementById(id);

    const formatDate = (date) => {
        if (!date) return "Not available";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Not available";
        }

        return parsedDate.toLocaleDateString();
    };

    const formatBloodType = (bt) => {
        if (!bt) return "Not available";
        const map = {
            A_POS: "A+", A_NEG: "A-",
            B_POS: "B+", B_NEG: "B-",
            AB_POS: "AB+", AB_NEG: "AB-",
            O_POS: "O+", O_NEG: "O-"
        };
        return map[bt] || bt;
    };


    // =====================================================
    // DASHBOARD ELEMENTS
    // =====================================================

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

    const recentActivity = $("recentActivity");
    const notificationPreview = $("notificationPreview");


    // =====================================================
    // DISPLAY DONOR INFORMATION
    // =====================================================

    function displayDonorInfo(donor) {

        if (!donor) {
            console.warn("No donor information received.");
            return;
        }

        console.log("Donor information:", donor);

        const user = donor.user || {};

        const name =
            user.name ||
            donor.name ||
            donor.fullName ||
            "Donor";

        const nameParts = name.trim().split(/\s+/);
        let initial = nameParts[0]?.charAt(0)?.toUpperCase() || '';
        if (nameParts.length > 1) {
            initial += nameParts[nameParts.length - 1]?.charAt(0)?.toUpperCase() || '';
        }

        // -------------------------
        // Name
        // -------------------------

        if (topbarName) {
            topbarName.textContent = `Hi, ${name}`;
        }

        // -------------------------
        // Initial
        // -------------------------

        if (profileInitial) {
            profileInitial.textContent = initial;
        }

        if (dashboardProfileInitial) {
            dashboardProfileInitial.textContent = initial;
        }

        // -------------------------
        // Welcome Name
        // -------------------------

        const welcomeDonorName = $("welcomeDonorName");
        if (welcomeDonorName) {
            const firstName = name.split(" ")[0];
            welcomeDonorName.textContent = firstName;
        }

        // -------------------------
        // Blood Type
        // -------------------------

        if (dashboardBloodType) {

            dashboardBloodType.textContent =
                formatBloodType(donor.bloodType);

        }

        // -------------------------
        // Location
        // -------------------------

        if (dashboardLocation) {

            dashboardLocation.textContent =
                donor.city ||
                donor.address ||
                "Not available";

        }

        // -------------------------
        // Availability
        // -------------------------

        const availability =
            donor.availabilityStatus ||
            "Not available";

        if (dashboardAvailability) {

            dashboardAvailability.textContent =
                availability;

        }

        // -------------------------
        // Donation Status
        // -------------------------

        if (donationStatus) {

            if (availability === "AVAILABLE") {

                donationStatus.textContent =
                    "Available to Donate";

            } else if (availability === "TEMPORARILY_UNAVAILABLE") {

                donationStatus.textContent =
                    "Temporarily Unavailable";

            } else if (availability === "UNAVAILABLE") {

                donationStatus.textContent =
                    "Unavailable";

            } else {

                donationStatus.textContent =
                    availability;
            }
        }

        if (donationStatusMessage) {

            if (availability === "AVAILABLE") {

                donationStatusMessage.textContent =
                    "Your donation can help someone in need.";

            } else {

                donationStatusMessage.textContent =
                    "Your current availability status is shown above.";
            }
        }
    }


    // =====================================================
    // DISPLAY DASHBOARD STATS
    // =====================================================

    function displayDashboardStats(stats) {

        if (!stats) {
            console.warn("No dashboard statistics received.");
            return;
        }

        console.log("Dashboard statistics:", stats);

        // -------------------------
        // Total Donations
        // -------------------------

        if (totalDonations) {

            totalDonations.textContent =
                stats.totalDonations ?? 0;
        }

        // -------------------------
        // Total / Pending Requests
        // -------------------------

        if (totalRequests) {

            totalRequests.textContent =
                stats.pendingRequests ?? 0;
        }

        // -------------------------
        // Last Donation
        // -------------------------

        if (lastDonation) {

            lastDonation.textContent =
                stats.lastDonationDate
                    ? formatDate(stats.lastDonationDate)
                    : "No donations yet";
        }

        // -------------------------
        // Next Eligible Date
        // -------------------------

        const nextEligible =
            $("nextEligible");

        if (nextEligible) {

            nextEligible.textContent =
                stats.nextEligibleDate
                    ? formatDate(stats.nextEligibleDate)
                    : "Not available";
        }

        // -------------------------
        // Lives Impacted
        // -------------------------

        const livesImpacted =
            $("livesImpacted");

        if (livesImpacted) {

            /*
             * The backend does not currently provide
             * a separate livesImpacted value.
             *
             * For now, use total donations as the
             * available value rather than inventing
             * another backend field.
             */

            livesImpacted.textContent =
                stats.totalDonations ?? 0;
        }

        // -------------------------
        // Donation Summary
        // -------------------------

        const donationTotal =
            $("donationTotal");

        if (donationTotal) {

            donationTotal.textContent =
                stats.totalDonations ?? 0;
        }

        // -------------------------
        // Current Year Donations
        // -------------------------

        const currentYearDonations =
            $("currentYearDonations");

        const previousYearDonations =
            $("previousYearDonations");

        /*
         * The dashboard endpoint does not currently
         * provide donations grouped by year.
         *
         * Therefore we do not invent these values.
         */

        if (currentYearDonations) {
            currentYearDonations.textContent = "—";
        }

        if (previousYearDonations) {
            previousYearDonations.textContent = "—";
        }
    }


    // =====================================================
    // DISPLAY AVAILABLE REQUESTS
    // =====================================================

    function displayAvailableRequests(requests) {

        const requestsList =
            document.querySelector(".requests-list");

        if (!requestsList) return;

        if (!Array.isArray(requests) || requests.length === 0) {

            requestsList.innerHTML = `
                <div class="request-card">
                    <div class="request-info">
                        <strong>No blood requests available.</strong>
                    </div>
                </div>
            `;

            return;
        }

        requestsList.innerHTML =
            requests.map(request => {

                const bloodType =
                    request.bloodType || "Unknown";

                const units =
                    request.unitsRequired ??
                    0;

                const hospitalName =
                    request.hospital?.user?.name ||
                    request.hospital?.name ||
                    "Hospital";

                const location =
                    request.location ||
                    "Location unavailable";

                const urgency =
                    request.urgency || "NORMAL";

                const urgencyClass =
                    urgency.toLowerCase();

                return `
                    <div class="request-card">

                        <div class="request-icon ${urgencyClass}-icon">
                            🩸
                        </div>

                        <div class="request-info">

                            <div class="request-title">
                                <strong>
                                    ${bloodType} Blood Needed
                                </strong>

                                <span>
                                    ${units} Units
                                </span>
                            </div>

                            <div class="request-location">
                                <strong>
                                    ${hospitalName}
                                </strong>

                                <span>
                                    | ${location}
                                </span>
                            </div>

                        </div>

                        <div class="request-meta">

                            <span class="urgency ${urgencyClass}">
                                ${urgency}
                            </span>

                        </div>

                        <a
                            href="donor-requests.html"
                            class="view-details"
                        >
                            View Details
                        </a>

                    </div>
                `;

            }).join("");
    }


    // =====================================================
    // DISPLAY RECENT ACTIVITY
    // =====================================================

    function displayRecentActivity(
        recentDonations,
        recentNotifications
    ) {

        if (!recentActivity) return;

        const donations =
            Array.isArray(recentDonations)
                ? recentDonations
                : [];

        const notifications =
            Array.isArray(recentNotifications)
                ? recentNotifications
                : [];

        if (
            donations.length === 0 &&
            notifications.length === 0
        ) {

            recentActivity.innerHTML = `
                <p>No recent activity available.</p>
            `;

            return;
        }

        let html = "";

        donations.slice(0, 3).forEach(donation => {

            html += `
                <div class="activity-item">

                    <strong>
                        Donation recorded
                    </strong>

                    <p>
                        ${formatDate(donation.donationDate)}
                    </p>

                </div>
            `;
        });

        notifications.slice(0, 3).forEach(notification => {

            html += `
                <div class="activity-item">

                    <strong>
                        ${notification.title || "Notification"}
                    </strong>

                    <p>
                        ${notification.message || ""}
                    </p>

                </div>
            `;
        });

        recentActivity.innerHTML = html;
    }


    // =====================================================
    // DISPLAY NOTIFICATIONS
    // =====================================================

    function displayNotifications(
        notifications,
        unreadCount
    ) {

        const notificationElements =
            document.querySelectorAll(
                ".notification-count, .notification-btn span"
            );

        notificationElements.forEach(element => {

            element.textContent =
                unreadCount ?? 0;
        });


        if (!notificationPreview) return;

        if (
            !Array.isArray(notifications) ||
            notifications.length === 0
        ) {

            notificationPreview.innerHTML = `
                <p>No new notifications.</p>
            `;

            return;
        }

        notificationPreview.innerHTML =
            notifications
                .slice(0, 3)
                .map(notification => {

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

                })
                .join("");
    }


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    async function loadDashboard() {

        try {

            console.log(
                "Loading donor dashboard..."
            );

            const response =
                await api.get("/donors/dashboard");

            console.log(
                "Raw dashboard response:",
                response
            );

            if (!response.success) {

                throw new Error(
                    response.message || "Dashboard request was not successful."
                );
            }

            const data =
                response.data;

            if (!data) {

                throw new Error(
                    "Dashboard response does not contain data."
                );
            }

            console.log(
                "Dashboard data:",
                data
            );

            // -------------------------
            // Donor
            // -------------------------

            displayDonorInfo(
                data.donor
            );

            // -------------------------
            // Statistics
            // -------------------------

            displayDashboardStats(
                data.stats
            );

            // -------------------------
            // Requests
            // -------------------------

            displayAvailableRequests(
                data.availableRequests
            );

            // -------------------------
            // Activity
            // -------------------------

            displayRecentActivity(
                data.recentDonations,
                data.recentNotifications
            );

            // -------------------------
            // Notifications
            // -------------------------

            displayNotifications(
                data.recentNotifications,
                data.stats?.unreadNotifications ?? 0
            );

        } catch (error) {

            console.error(
                "Failed to load donor dashboard:",
                error
            );

            const welcomeEl = document.getElementById("welcomeDonorName");
            if (welcomeEl) {
                welcomeEl.textContent = "";
            }
            const bloodTypeEl = document.getElementById("dashboardBloodType");
            if (bloodTypeEl) {
                bloodTypeEl.textContent = error.message || "Error loading data";
                bloodTypeEl.style.color = "#dc2626";
            }
            if (
                error.message?.includes("401") ||
                error.message?.includes("403") ||
                error.message?.includes("unauthorized") ||
                error.message?.includes("Invalid token") ||
                error.message?.includes("Forbidden")
            ) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "login.html";
            }
        }
    }


    // =====================================================
    // SIDEBAR NAVIGATION
    // =====================================================

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


    // =====================================================
    // START DASHBOARD
    // =====================================================

    loadDashboard();

});