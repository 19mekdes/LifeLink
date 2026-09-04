import api from "./api/api.js";

console.log("Donor Profile JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    const $ = (id) => document.getElementById(id);

   
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


    let donor = null;
 
   function displayProfile(data) {

    if (!data) return;

    donor = data.donor || data.profile || data;


    const user = donor.user || {};

    const name =
        user.name ||
        donor.name ||
        donor.fullName ||
        "Not available";

    const email =
        user.email ||
        donor.email ||
        "Not available";

    const phone =
        user.phone ||
        donor.phone ||
        donor.phoneNumber ||
        "Not available";

    const bloodType =
        donor.bloodType ||
        "Not available";

    const location =
        donor.city ||
        donor.address ||
        donor.location ||
        "Not available";

    const availability =
        donor.availabilityStatus ||
        donor.availability ||
        donor.status ||
        "Not available";

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
        donorBloodType.textContent =
            bloodType;
    }

    if (donorLocation) {
        donorLocation.textContent =
            location;
    }

    if (donorStatus) {
        const statusMap = {
            'AVAILABLE': 'Available',
            'TEMPORARILY_UNAVAILABLE': 'Temporarily Unavailable',
            'UNAVAILABLE': 'Unavailable'
        };
        donorStatus.textContent =
            statusMap[availability] || availability;
    }

const initial =
    name.charAt(0).toUpperCase();



if (topbarName) {
    topbarName.textContent =
        name;
}

if (profileInitial) {
    profileInitial.textContent =
        initial;
}

if (largeProfileInitial) {
    largeProfileInitial.textContent =
        initial;
}

document.querySelectorAll(".profile-name").forEach(element => {
    element.textContent = name;
});

document.querySelectorAll(".profile-avatar").forEach(element => {
    element.textContent = initial;
});

const dashboardProfileName = document.getElementById("dashboardProfileName");
if (dashboardProfileName) {
    dashboardProfileName.textContent = name;
}
    

    if (availabilityText) {
        const statusMapDisplay = {
            'AVAILABLE': 'Available',
            'TEMPORARILY_UNAVAILABLE': 'Temporarily Unavailable',
            'UNAVAILABLE': 'Unavailable'
        };
        availabilityText.textContent =
            statusMapDisplay[availability] || availability;
    }


    localStorage.setItem(
        "lifelinkDonor",
        JSON.stringify(donor)
    );
}


    async function loadProfile() {

        try {

            const data =
                await api.get(
                "/donors/profile"
            );

            console.log(
                "Profile data:",
                data
            );

            displayProfile(data.data);

        } catch (error) {

            console.error(
                "Failed to load profile:",
                error
            );

        

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


            const bloodTypeBackend = {
    "A+": "A_POS",
    "A-": "A_NEG",
    "B+": "B_POS",
    "B-": "B_NEG",
    "AB+": "AB_POS",
    "AB-": "AB_NEG",
    "O+": "O_POS",
    "O-": "O_NEG"
};

const updatedData = {

    name: name,

    city: location,

    bloodType:
        bloodTypeBackend[bloodType] || bloodType

};


            try {

             const result =
    await api.put(
        "/donors/profile",
        updatedData
    );

console.log(
    "Updated profile:",
    result
);

// Backend response is inside result.data
displayProfile(result.data);

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
                donor.availabilityStatus ||
                donor.availability ||
                donor.status ||
                "AVAILABLE";


            const newAvailability =
                currentAvailability === "AVAILABLE"
                    ? "UNAVAILABLE"
                    : "AVAILABLE";


            try {

                const result =
                    await api.put(
                        "/donors/availability",
                        {
                            availabilityStatus: newAvailability
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


    async function loadNotificationCount() {

    try {

        const data =
            await api.get(
                "/donors/notifications"
            );

        console.log(
            "Profile notification response:",
            data
        );

        const unread =
            data?.data?.unreadCount || 0;

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


    exitEditMode();

    loadProfile();

    loadNotificationCount();

});