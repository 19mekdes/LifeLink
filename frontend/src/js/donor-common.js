console.log("Donor common JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // PROFILE / USER INFORMATION
    // ==========================================

    function getSavedDonor() {

        try {

            const saved =
                localStorage.getItem("lifelinkDonor");

            return saved
                ? JSON.parse(saved)
                : null;

        } catch (error) {

            console.error(
                "Could not read donor information:",
                error
            );

            return null;
        }
    }


    function displayDonorHeader() {

        const donor = getSavedDonor();

        if (!donor) return;

        const name =
            donor.name ||
            donor.fullName ||
            "Donor";


        const initial =
            name.charAt(0).toUpperCase();


        const topbarName =
            document.getElementById("topbarName");

        const profileInitial =
            document.getElementById("profileInitial");

        const dashboardProfileInitial =
            document.getElementById(
                "dashboardProfileInitial"
            );


        if (topbarName) {
            topbarName.textContent = name;
        }


        if (profileInitial) {
            profileInitial.textContent = initial;
        }


        if (dashboardProfileInitial) {
            dashboardProfileInitial.textContent =
                initial;
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


            const counters =
                document.querySelectorAll(
                    "#notificationCount, #topNotificationCount"
                );


            counters.forEach(counter => {

                counter.textContent =
                    unread;

            });


        } catch (error) {

            console.error(
                "Could not load notification count:",
                error
            );
        }
    }


    // ==========================================
    // SIDEBAR ACTIVE LINK
    // ==========================================

    function setActiveNavigation() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop();


        document
            .querySelectorAll(
                ".sidebar nav a, .top-navigation a"
            )
            .forEach(link => {

                const href =
                    link.getAttribute("href");

                if (!href) return;


                const linkPage =
                    href.split("/")
                        .pop();


                if (
                    linkPage === currentPage
                ) {

                    link.classList.add(
                        "active"
                    );

                } else {

                    link.classList.remove(
                        "active"
                    );
                }

            });
    }


    // ==========================================
    // LOGOUT
    // ==========================================

    function setupLogout() {

        document
            .querySelector(".logout")
            ?.addEventListener(
                "click",
                event => {

                    const confirmed =
                        confirm(
                            "Are you sure you want to logout?"
                        );


                    if (!confirmed) {

                        event.preventDefault();

                        return;
                    }


                    // Remove temporary donor data

                    localStorage.removeItem(
                        "lifelinkDonor"
                    );

                    // If your backend later stores a JWT,
                    // we'll remove that token here too.
                }
            );
    }


    // ==========================================
    // START COMMON FEATURES
    // ==========================================

    displayDonorHeader();

    loadNotificationCount();

    setActiveNavigation();

    setupLogout();

});