document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // Donor Information
    // ==============================

    const defaultDonor = {
        name: "Kalkidan Donor",
        email: "donor@lifelink.com",
        phone: "+251 900 000 000",
        bloodType: "O+",
        location: "Addis Ababa",
        status: "Available"
    };

    const donor = JSON.parse(
        localStorage.getItem("lifelinkDonor")
    ) || defaultDonor;


    // ==============================
    // Display Donor Profile
    // ==============================

    const donorName = document.getElementById("donorName");
    const donorEmail = document.getElementById("donorEmail");
    const donorPhone = document.getElementById("donorPhone");
    const donorBloodType = document.getElementById("donorBloodType");
    const donorLocation = document.getElementById("donorLocation");
    const donorStatus = document.getElementById("donorStatus");
    const profileInitial = document.getElementById("profileInitial");

    if (donorName) donorName.textContent = donor.name;
    if (donorEmail) donorEmail.textContent = donor.email;
    if (donorPhone) donorPhone.textContent = donor.phone;
    if (donorBloodType) donorBloodType.textContent = donor.bloodType;
    if (donorLocation) donorLocation.textContent = donor.location;
    if (donorStatus) donorStatus.textContent = donor.status;

    if (profileInitial) {
        profileInitial.textContent =
            donor.name.charAt(0).toUpperCase();
    }


    // ==============================
    // Sidebar Navigation
    // ==============================

    const navLinks = document.querySelectorAll(".sidebar nav a");

    navLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = link.getAttribute("href");

            if (targetId && targetId.startsWith("#")) {

                event.preventDefault();

                const target = document.querySelector(targetId);

                if (target) {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }

            navLinks.forEach(function (item) {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });

    });


    // ==============================
    // Edit Profile
    // ==============================

    const editProfileBtn =
        document.getElementById("editProfileBtn");

    const saveProfileBtn =
        document.getElementById("saveProfileBtn");

    const cancelProfileBtn =
        document.getElementById("cancelProfileBtn");

    const profileActions =
        document.getElementById("profileActions");

    const editName =
        document.getElementById("editName");

    const editPhone =
        document.getElementById("editPhone");

    const editLocation =
        document.getElementById("editLocation");

    const editBloodType =
        document.getElementById("editBloodType");

    const profileInputs =
        document.querySelectorAll(".profile-input");


    if (editProfileBtn) {

        editProfileBtn.addEventListener("click", function () {

            editName.value = donor.name;
            editPhone.value = donor.phone;
            editLocation.value = donor.location;
            editBloodType.value = donor.bloodType;

            profileInputs.forEach(function (input) {
                input.style.display = "block";
            });

            profileActions.style.display = "flex";
            editProfileBtn.style.display = "none";
        });
    }


    if (saveProfileBtn) {

        saveProfileBtn.addEventListener("click", function () {

            donor.name = editName.value.trim();
            donor.phone = editPhone.value.trim();
            donor.location = editLocation.value.trim();
            donor.bloodType = editBloodType.value;


            if (!donor.name || !donor.phone || !donor.location) {
              alert("Please fill in all required fields.");

                return;
            }


            donorName.textContent = donor.name;
            donorPhone.textContent = donor.phone;
            donorLocation.textContent = donor.location;
            donorBloodType.textContent = donor.bloodType;

            profileInitial.textContent =
                donor.name.charAt(0).toUpperCase();


            localStorage.setItem(
                "lifelinkDonor",
                JSON.stringify(donor)
            );


            exitEditMode();

            alert("Profile updated successfully.");
        });
    }


    if (cancelProfileBtn) {

        cancelProfileBtn.addEventListener("click", function () {
            exitEditMode();
        });
    }


    function exitEditMode() {

        profileInputs.forEach(function (input) {
            input.style.display = "none";
        });

        profileActions.style.display = "none";
        editProfileBtn.style.display = "block";
    }


    // ==============================
    // Donation History
    // ==============================

    const donations = [
        {
            location: "City Blood Bank",
            date: "June 20, 2026",
            status: "Completed"
        },
        {
            location: "Red Cross Center",
            date: "March 15, 2026",
            status: "Completed"
        }
    ];


    const donationList =
        document.getElementById("donationList");


    if (donationList) {

        if (donations.length === 0) {

            donationList.innerHTML =
                "<p>No donation history available.</p>";

        } else {

            donations.forEach(function (donation) {

                const donationItem =
                    document.createElement("div");

                donationItem.className =
                    "donation-item";


                donationItem.innerHTML = 
                    <div>
                        <strong>${donation.location}</strong>
                        <p>${donation.date}</p>
                    </div>

                    <span class="completed">
                        ${donation.status}
                    </span>
                ;


                donationList.appendChild(donationItem);
            });
        }
    }


    // ==============================
    // Blood Request
    // ==============================

    const respondButton =
        document.querySelector(".respond-btn");


    if (respondButton) {

        respondButton.addEventListener("click", function () {

            const confirmation = confirm(
                "Would you like to respond to this blood request?"
            );


            if (confirmation) {

                respondButton.textContent =
                    "Response Sent";

                respondButton.disabled = true;

                alert(
                    "Thank you for responding. The blood bank has been notified."
                );
            }
        });
    }


    // ==============================
    // Logout
    // ==============================

    const logoutButton =
        document.querySelector(".logout");


    if (logoutButton) {

        logoutButton.addEventListener("click", function (event) {

            const confirmation = confirm(
                "Are you sure you want to logout?"
            );


            if (!confirmation) {
                event.preventDefault();
            }
        });
    }

});