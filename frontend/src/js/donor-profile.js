console.log("Donor Profile JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    const $ = (id) => document.getElementById(id);

    // ==========================================
    // PROFILE ELEMENTS
    // ==========================================

    const donorName = $("donorName");
    const donorEmail = $("donorEmail");
    const donorPhone = $("donorPhone");
    const donorBloodType = $("donorBloodType");
    const donorLocation = $("donorLocation");
    const donorStatus = $("donorStatus");

    const topbarName = $("topbarName");
    const profileInitial = $("profileInitial");
    const largeProfileInitial = $("largeProfileInitial");

    const editProfileBtn = $("editProfileBtn");
    const saveProfileBtn = $("saveProfileBtn");
    const cancelProfileBtn = $("cancelProfileBtn");

    const profileActions = $("profileActions");

    const editName = $("editName");
    const editPhone = $("editPhone");
    const editLocation = $("editLocation");
    const editBloodType = $("editBloodType");

    const availabilityText = $("availabilityText");
    const availabilityBtn = $("availabilityBtn");

    const notificationCount = $("notificationCount");


    // ==========================================
    // CURRENT DONOR
    // ==========================================

    let donor = null;


    // ==========================================
    // DISPLAY PROFILE
    // ==========================================

    function displayProfile(data) {

        if (!data) return;

        donor = data.donor || data.profile || data;

        const name =
            donor.name ||
            donor.fullName ||
            "Donor";

        const email =
            donor.email ||
            "Not available";

        const phone =
            donor.phone ||
            donor.phoneNumber ||
            "Not available";

        const bloodType =
            donor.bloodType ||
            "Not available";

        const location =
            donor.location ||
            "Not available";

        const availability =
            donor.availability ||
            donor.status ||
            "Not available";


        // Main profile

        if (donorName) {
            donorName.textContent = name;
        }

        if (donorEmail) {
            donorEmail.textContent = email;
        }

        if (donorPhone) {
            donorPhone.textContent = phone;
        }

        if (donorBloodType) {
            donorBloodType.textContent = bloodType;
        }

        if (donorLocation) {
            donorLocation.textContent = location;
        }

        if (donorStatus) {
            donorStatus.textContent = availability;
        }


        // Topbar

        if (topbarName) {
            topbarName.textContent = name;
        }


        // Profile initials

        const initial =
            name.charAt(0).toUpperCase();

        if (profileInitial) {
            profileInitial.textContent = initial;
        }

        if (largeProfileInitial) {
            largeProfileInitial.textContent = initial;
        }


        // Availability section

        if (availabilityText) {
            availabilityText.textContent =
                availability;
        }


        // Store current donor locally

        localStorage.setItem(
            "lifelinkDonor",
            JSON.stringify(donor)
        );
    }


    // ==========================================
    // LOAD PROFILE
    // ==========================================

    async function loadProfile() {

        try {

            const data =
                await apiRequest(
                    "/api/donors/profile"
                );

            console.log(
                "Profile data:",
                data
            );

            displayProfile(data);

        } catch (error) {

            console.error(
                "Failed to load profile:",
                error
            );

            /*
             * Temporary fallback only for development.
             * It allows the page to remain usable while
             * the backend is offline.
             */

            const saved =
                localStorage.getItem(
                    "lifelinkDonor"
                );

            if (saved) {

                try {

                    displayProfile(
                        JSON.parse(saved)
                    );

                } catch (e) {

                    console.error(
                        "Invalid local donor data"
                    );

                }
            }
        }
    }


    // ==========================================
    // ENTER EDIT MODE
    // ==========================================

    editProfileBtn?.addEventListener(
        "click",
        () => {

            if (!donor) {
                alert(
                    "Donor information is not available yet."
                );
                return;
            }


            editName.value =
                donor.name ||
                donor.fullName ||
                "";

            editPhone.value =
                donor.phone ||
                donor.phoneNumber ||
                "";

            editLocation.value =
                donor.location ||
                "";

            editBloodType.value =
                donor.bloodType ||
                "";


            document
                .querySelectorAll(".profile-input")
                .forEach(input => {
                    input.style.display = "block";
                });


            if (profileActions) {
                profileActions.style.display =
                    "flex";
            }

            editProfileBtn.style.display =
                "none";
        }
    );


    // ==========================================
    // SAVE PROFILE
    // ==========================================

    saveProfileBtn?.addEventListener(
        "click",
        async () => {

            const name =
                editName.value.trim();

            const phone =
                editPhone.value.trim();

            const location =
                editLocation.value.trim();

            const bloodType =
                editBloodType.value;


            if (!name || !phone || !location) {

                alert(
                    "Please fill in all required fields."
                );

                return;
            }


            const updatedData = {

                name: name,

                phone: phone,

                location: location,

                bloodType: bloodType

            };


            try {

                const result =
                    await apiRequest(
                        "/api/donors/profile",
                        {
                            method: "PUT",

                            body:
                                JSON.stringify(
                                    updatedData
                                )
                        }
                    );


                console.log(
                    "Updated profile:",
                    result
                );


                // Update page using backend response

                displayProfile(
                    result.donor ||
                    result.profile ||
                    result
                );


                exitEditMode();


                alert(
                    "Profile updated successfully."
                );


            } catch (error) {

                console.error(
                    "Failed to update profile:",
                    error
                );

                alert(
                    "Unable to update profile. Please try again."
                );
            }
        }
    );


    // ==========================================
    // CANCEL EDIT
    // ==========================================

    function exitEditMode() {

        document
            .querySelectorAll(".profile-input")
            .forEach(input => {
                input.style.display = "none";
            });


        if (profileActions) {
            profileActions.style.display =
                "none";
        }


        if (editProfileBtn) {
            editProfileBtn.style.display =
                "block";
        }
    }


    cancelProfileBtn?.addEventListener(
        "click",
        exitEditMode
    );


    // ==========================================
    // UPDATE AVAILABILITY
    // ==========================================

    availabilityBtn?.addEventListener(
        "click",
        async () => {

            if (!donor) {

                alert(
                    "Donor information is not available."
                );

                return;
            }


            const currentAvailability =
                donor.availability ||
                donor.status ||
                "Available";


            const newAvailability =
                currentAvailability === "Available"
                    ? "Unavailable"
                    : "Available";


            try {

                const result =
                    await apiRequest(
                        "/api/donors/availability",
                        {
                            method: "PUT",

                            body: JSON.stringify({
                                availability:
                                    newAvailability
                            })
                        }
                    );


                console.log(
                    "Availability updated:",
                    result
                );


                // Update local donor

                donor.availability =
                    newAvailability;


                displayProfile(donor);


                alert(
                    `Availability updated to ${newAvailability}.`
                );


            } catch (error) {

                console.error(
                    "Failed to update availability:",
                    error
                );

                alert(
                    "Unable to update availability."
                );
            }
        }
    );


    // ==========================================
    // LOAD NOTIFICATION COUNT
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
                "Failed to load notification count:",
                error
            );
        }
    }


    // ==========================================
    // NAVIGATION
    // ==========================================

    document
        .querySelectorAll(".sidebar nav a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".sidebar nav a"
                        )
                        .forEach(item => {
                            item.classList.remove(
                                "active"
                            );
                        });

                    link.classList.add(
                        "active"
                    );
                }
            );
        });


    // ==========================================
    // LOGOUT
    // ==========================================

    document
        .querySelector(".logout")
        ?.addEventListener(
            "click",
            event => {

                if (
                    !confirm(
                        "Are you sure you want to logout?"
                    )
                ) {
                    event.preventDefault();
                }
            }
        );


    // ==========================================
    // START
    // ==========================================

    exitEditMode();

    loadProfile();

    loadNotificationCount();

});