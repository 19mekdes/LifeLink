import api from './api/api.js';

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

    const bloodType =
        document.getElementById("bloodType");

    async function loadDonationHistory() {

        try {



            const data =
                await api.get(
                    "/donors/donations"
                );

            console.log(
                "DONATION HISTORY API DATA:",
                data
            );


            const donations =
                data?.data?.donations || [];

            const stats =
                data?.data?.stats || {};



            if (totalDonations) {

                totalDonations.textContent =
                    stats.totalDonations ?? donations.length;
            }



            if (lastDonation) {

                if (donations.length) {

                    const latest =
                        donations[0];

                    lastDonation.textContent =
                        latest.date ||
                        latest.donationDate ||
                        latest.createdAt ||
                        "Not available";

                } else {

                    lastDonation.textContent = "--";

                }
            }




            if (!donationList) return;


            if (!donations.length) {

                donationList.innerHTML = `
                <p>
                    No donation history available.
                </p>
            `;

            } else {

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

            }



            const profileResponse =
                await api.get(
                    "/donors/profile"
                );

            console.log(
                "DONOR PROFILE FOR HISTORY:",
                profileResponse
            );



            const profile =
                profileResponse?.data || {};
            console.log("EXTRACTED PROFILE:", profile);
            console.log("BLOOD TYPE:", profile.bloodType);


            if (bloodType) {

                bloodType.textContent =
                    profile.bloodType ||
                    profile.blood_group ||
                    profile.bloodGroup ||
                    "--";
            }


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




    async function loadNotificationCount() {

        try {

            const data =
                await api.get(
                    "/donors/notifications"
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


    loadDonationHistory();
    loadNotificationCount();

});