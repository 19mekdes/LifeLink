console.log("Donor common JS is working!");


document.addEventListener("DOMContentLoaded", () => {


    // =====================================================
    // HELPER
    // =====================================================

    const $ = (id) => document.getElementById(id);


    // =====================================================
    // PROFILE / USER INFORMATION
    // =====================================================

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
            $("topbarName");

        const profileInitial =
            $("profileInitial");

        const dashboardProfileInitial =
            $("dashboardProfileInitial");


        if (topbarName) {

            topbarName.textContent =
                name;
        }


        if (profileInitial) {

            profileInitial.textContent =
                initial;
        }


        if (dashboardProfileInitial) {

            dashboardProfileInitial.textContent =
                initial;
        }
    }


    // =====================================================
    // PROFILE DROPDOWN
    // =====================================================

    function setupProfileDropdown() {

        const profileButton =
            $("profileButton");

        const profileDropdown =
            $("profileDropdown");

        const logoutButton =
            $("logoutButton");


        /*
         * Some donor pages may not have the
         * profile dropdown.
         *
         * If it doesn't exist, simply stop.
         */

        if (
            !profileButton ||
            !profileDropdown
        ) {
            return;
        }


        // Open / close dropdown

        profileButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                profileDropdown.classList.toggle(
                    "show"
                );

            }
        );


        // Close dropdown when clicking outside

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !profileButton.contains(
                        event.target
                    ) &&
                    !profileDropdown.contains(
                        event.target
                    )
                ) {

                    profileDropdown.classList.remove(
                        "show"
                    );
                }

            }
        );


        // Logout inside profile dropdown

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    localStorage.removeItem(
                        "lifelinkDonor"
                    );


                    window.location.href =
                        "login.html";

                }
            );
        }

    }


    // =====================================================
    // NOTIFICATION COUNT
    // =====================================================

    async function loadNotificationCount() {

        /*
         * apiRequest is provided by api.js.
         */

        if (
            typeof apiRequest !==
            "function"
        ) {
            return;
        }


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


            counters.forEach(
                counter => {

                    counter.textContent =
                        unread;

                }
            );


        } catch (error) {

            console.error(
                "Could not load notification count:",
                error
            );

        }
    }


    // =====================================================
    // SIDEBAR TOGGLE
    // =====================================================

    function setupSidebar() {

        const sidebar =
            $("sidebar");

        const sidebarToggle =
            $("sidebarToggle");


        /*
         * Every donor page should have these.
         *
         * If one is missing, don't crash
         * the rest of the common JavaScript.
         */

        if (
            !sidebar ||
            !sidebarToggle
        ) {

            console.warn(
                "Sidebar or sidebar toggle was not found."
            );

            return;
        }


        // Toggle sidebar

        sidebarToggle.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                sidebar.classList.toggle(
                    "open"
                );

            }
        );

    }


    // =====================================================
    // SIDEBAR ACTIVE LINK
    // =====================================================

    function setActiveNavigation() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop();


        document
            .querySelectorAll(
                ".sidebar nav a, .top-navigation a"
            )
            .forEach(
                link => {

                    const href =
                        link.getAttribute(
                            "href"
                        );


                    if (!href) {
                        return;
                    }


                    const linkPage =
                        href
                            .split("/")
                            .pop();


                    if (
                        linkPage ===
                        currentPage
                    ) {

                        link.classList.add(
                            "active"
                        );

                    } else {

                        link.classList.remove(
                            "active"
                        );

                    }

                }
            );

    }


    // =====================================================
    // SIDEBAR LOGOUT
    // =====================================================

    function setupLogout() {

        const logout =
            document.querySelector(
                ".sidebar .logout"
            );


        if (!logout) {
            return;
        }


        logout.addEventListener(
            "click",
            function (event) {

                const confirmed =
                    confirm(
                        "Are you sure you want to logout?"
                    );


                if (!confirmed) {

                    event.preventDefault();

                    return;
                }


                localStorage.removeItem(
                    "lifelinkDonor"
                );

            }
        );

    }


    // =====================================================
    // START COMMON FEATURES
    // =====================================================

    displayDonorHeader();

    setupProfileDropdown();

    loadNotificationCount();

    setupSidebar();

    setActiveNavigation();

    setupLogout();

});