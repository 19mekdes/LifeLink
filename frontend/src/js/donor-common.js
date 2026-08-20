console.log("Donor common JS is working!");


document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       GET SAVED DONOR
    ===================================================== */

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


    /* =====================================================
       DISPLAY DONOR HEADER
    ===================================================== */

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


        /*
         * Update profile menu if it exists.
         */

        const profileNames =
            document.querySelectorAll(
                ".profile-name"
            );


        profileNames.forEach(element => {

            element.textContent = name;

        });


        const profileAvatars =
            document.querySelectorAll(
                ".profile-avatar"
            );


        profileAvatars.forEach(element => {

            if (
                element.classList.contains("large")
            ) {

                element.textContent =
                    initial;

            } else {

                element.textContent =
                    initial;

            }

        });

    }


    /* =====================================================
       NOTIFICATION COUNT
    ===================================================== */

    async function loadNotificationCount() {

    try {

        const data =
            await api.get("/donors/notifications");

        console.log(
            "Notification response:",
            data
        );

        const notifications =
            data?.data?.notifications || [];

        const unread =
            data?.data?.unreadCount || 0;

        const counters =
            document.querySelectorAll(
                "#notificationCount, #topNotificationCount"
            );

        counters.forEach(counter => {
            counter.textContent = unread;
        });

    } catch (error) {

        console.error(
            "Could not load notification count:",
            error
        );

    }

}


    /* =====================================================
       ACTIVE SIDEBAR LINK
    ===================================================== */

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


    /* =====================================================
       PROFILE DROPDOWN
    ===================================================== */

    function setupProfileDropdown() {

        const profileButton =
            document.getElementById(
                "profileButton"
            );

        const profileDropdown =
            document.getElementById(
                "profileDropdown"
            );


        if (
            !profileButton ||
            !profileDropdown
        ) {

            return;

        }


        profileButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                profileDropdown.classList.toggle(
                    "show"
                );

            }
        );


        document.addEventListener(
            "click",
            event => {

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

    }


    /* =====================================================
   LOGOUT
===================================================== */

    function setupLogout() {

        const logoutButton =
            document.getElementById("logoutButton");

        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener("click", event => {

            event.preventDefault();
            event.stopPropagation();

            const confirmed =
                confirm("Are you sure you want to logout?");

            if (!confirmed) {
                return;
            }

            // Remove donor authentication data
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("lifelinkDonor");

            // Go to login page
            window.location.href = "login.html";

        });

    }

    /* =====================================================
       SIDEBAR
    ===================================================== */

    function setupSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const sidebarToggle =
            document.getElementById(
                "sidebarToggle"
            );


        if (
            !sidebar ||
            !sidebarToggle
        ) {

            console.warn(
                "Sidebar elements were not found."
            );

            return;

        }


        /* -----------------------------------------------
           INITIAL STATE
        ------------------------------------------------ */

        if (window.innerWidth > 768) {

            /*
             * Desktop starts expanded.
             */

            sidebar.classList.add(
                "open"
            );

        } else {

            /*
             * Mobile starts collapsed.
             */

            sidebar.classList.remove(
                "open"
            );

        }


        /* -----------------------------------------------
           TOGGLE
        ------------------------------------------------ */

        sidebarToggle.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                sidebar.classList.toggle(
                    "open"
                );

            }
        );


        /* -----------------------------------------------
           RESIZE
        ------------------------------------------------ */

        let previousWidth =
            window.innerWidth;


        window.addEventListener(
            "resize",
            () => {

                const currentWidth =
                    window.innerWidth;


                /*
                 * Only change the state when
                 * crossing the desktop/mobile
                 * breakpoint.
                 */

                const crossedBreakpoint =
                    (
                        previousWidth > 768 &&
                        currentWidth <= 768
                    ) ||
                    (
                        previousWidth <= 768 &&
                        currentWidth > 768
                    );


                if (crossedBreakpoint) {

                    if (
                        currentWidth > 768
                    ) {

                        sidebar.classList.add(
                            "open"
                        );

                    } else {

                        sidebar.classList.remove(
                            "open"
                        );

                    }

                }


                previousWidth =
                    currentWidth;

            }
        );

    }


    /* =====================================================
       START COMMON FEATURES
    ===================================================== */

    displayDonorHeader();

    loadNotificationCount();

    setActiveNavigation();

    setupProfileDropdown();

    setupLogout();

    setupSidebar();

});