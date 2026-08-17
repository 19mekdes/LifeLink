console.log("Donor History JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    const donationList =
        document.getElementById("donationList");

    const totalDonations =
        document.getElementById("totalDonations");

    const lastDonation =
        document.getElementById("lastDonation");

    const notificationCount =
        document.getElementById("notificationCount");


    // ==========================================
    // LOAD DONATION HISTORY
    // ==========================================

    async function loadDonationHistory() {

        try {

            const data =
                await apiRequest(
                    "/api/donors/donations"
                );

            console.log(
                "Donation history:",
                data
            );


            const donations =
                Array.isArray(data)
                    ? data
                    : data.donations || [];


            // ==================================
            // TOTAL DONATIONS
            // ==================================

            if (totalDonations) {

                totalDonations.textContent =
                    donations.length;
            }


            // ==================================
            // LAST DONATION
            // ==================================

            if (
                lastDonation &&
                donations.length
            ) {

                const latest =
                    donations[0];

                lastDonation.textContent =
                    latest.date ||
                    latest.donationDate ||
                    latest.createdAt ||
                    "Not available";
            }


            // ==================================
            // DONATION LIST
            // ==================================

            if (!donationList) return;


            if (!donations.length) {

                donationList.innerHTML = `
                    <p>
                        No donation history available.
                    </p>
                `;

                return;
            }


            donationList.innerHTML =
                donations.map(donation => {

                    const location =
                        donation.location ||
                        donation.hospital ||
                        donation.bloodBank ||
                        "Location unavailable";


                    const date =
                        donation.date ||
                        donation.donationDate ||
                        donation.createdAt ||
                        "Date unavailable";


                    const status =
                        donation.status ||
                        "Completed";


                    return `
                        <div class="donation-item">

                            <div>

                                <strong>
                                    ${location}
                                </strong>

                                <p>
                                    ${date}
                                </p>

                            </div>

                            <span class="completed">
                                ${status}
                            </span>

                        </div>
                    `;

                }).join("");


        } catch (error) {

            console.error(
                "Failed to load donation history:",
                error
            );


            if (donationList) {

                donationList.innerHTML = `
                    <p>
                        Unable to load donation history.
                    </p>
                `;
            }
        }
    }


    // ==========================================
    // NOTIFICATION COUNT
    // ==========================================

    async function loadNotificationCount() {

        try {

            const data =
                await apiRequest(
                    "/api/donors/notifications"
                );


            const notifications =
                Array.isArray(data)
                    ? data
                    : data.notifications || [];


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


        } catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );
        }
    }


    // ==========================================
    // START
    // ==========================================

    loadDonationHistory();
    loadNotificationCount();

});