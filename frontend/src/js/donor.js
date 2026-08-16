console.log("Donor JS is working!")
document.addEventListener("DOMContentLoaded", () => {

    const defaultDonor = {
        name: "Kalkidan Donor",
        email: "donor@lifelink.com",
        phone: "+251 900 000 000",
        bloodType: "O+",
        location: "Addis Ababa",
        status: "Available"
    };

    let donor = JSON.parse(localStorage.getItem("lifelinkDonor")) || defaultDonor;

    const $ = id => document.getElementById(id);

    const donorName = $("donorName");
    const donorEmail = $("donorEmail");
    const donorPhone = $("donorPhone");
    const donorBloodType = $("donorBloodType");
    const donorLocation = $("donorLocation");
    const donorStatus = $("donorStatus");
    const profileInitial = $("profileInitial");

    function displayProfile() {
        if (donorName) donorName.textContent = donor.name;
        if (donorEmail) donorEmail.textContent = donor.email;
        if (donorPhone) donorPhone.textContent = donor.phone;
        if (donorBloodType) donorBloodType.textContent = donor.bloodType;
        if (donorLocation) donorLocation.textContent = donor.location;
        if (donorStatus) donorStatus.textContent = donor.status;
        if (profileInitial) profileInitial.textContent = donor.name.charAt(0).toUpperCase();

        const cardBloodType = $("cardBloodType");
        if (cardBloodType) cardBloodType.textContent = donor.bloodType;
    }

    displayProfile();


    // Sidebar navigation
    document.querySelectorAll(".sidebar nav a").forEach(link => {
        link.addEventListener("click", event => {
            const targetId = link.getAttribute("href");

            if (targetId === "#") {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (targetId?.startsWith("#")) {
                event.preventDefault();

                const target = document.querySelector(targetId);

                if (target) {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }

            document.querySelectorAll(".sidebar nav a")
                .forEach(item => item.classList.remove("active"));

            link.classList.add("active");
        });
    });


    // Edit profile
    const editProfileBtn = $("editProfileBtn");
    const saveProfileBtn = $("saveProfileBtn");
    const cancelProfileBtn = $("cancelProfileBtn");
    const profileActions = $("profileActions");

    const editName = $("editName");
    const editPhone = $("editPhone");
    const editLocation = $("editLocation");
    const editBloodType = $("editBloodType");

    const profileInputs = document.querySelectorAll(".profile-input");

    function exitEditMode() {
        profileInputs.forEach(input => input.style.display = "none");
        profileActions.style.display = "none";
        editProfileBtn.style.display = "block";
    }

    editProfileBtn?.addEventListener("click", () => {
        editName.value = donor.name;
        editPhone.value = donor.phone;
        editLocation.value = donor.location;
        editBloodType.value = donor.bloodType;

        profileInputs.forEach(input => input.style.display = "block");
        profileActions.style.display = "flex";
        editProfileBtn.style.display = "none";
    });

    saveProfileBtn?.addEventListener("click", () => {
        const name = editName.value.trim();
        const phone = editPhone.value.trim();
        const location = editLocation.value.trim();

        if (!name || !phone || !location) {
            alert("Please fill in all required fields.");
            return;
        }

        donor.name = name;
        donor.phone = phone;
        donor.location = location;
        donor.bloodType = editBloodType.value;

        localStorage.setItem("lifelinkDonor", JSON.stringify(donor));

        displayProfile();
        exitEditMode();

        alert("Profile updated successfully.");
    });

    cancelProfileBtn?.addEventListener("click", exitEditMode);
    // Donation history
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

    const donationList = $("donationList");
    const totalDonations = $("totalDonations");
    const lastDonation = $("lastDonation");

    if (donationList) {
        if (!donations.length) {
            donationList.innerHTML = "<p>No donation history available.</p>";
        } else {
            donations.forEach(donation => {
                const item = document.createElement("div");
                item.className = "donation-item";

                item.innerHTML =
                    "<div>" +
                    "<strong>" + donation.location + "</strong>" +
                    "<p>" + donation.date + "</p>" +
                    "</div>" +
                    "<span class='completed'>" +
                    donation.status +
                    "</span>";

                donationList.appendChild(item);
            });
        }
    }

    if (totalDonations) totalDonations.textContent = donations.length;
    if (lastDonation && donations.length) {
        lastDonation.textContent = donations[0].date;
    }


    // Blood request
    const respondButton = document.querySelector(".respond-btn");

    respondButton?.addEventListener("click", () => {
        if (respondButton.disabled) return;

        const confirmation = confirm(
            "Would you like to respond to this blood request?"
        );

        if (confirmation) {
            respondButton.textContent = "Response Sent";
            respondButton.disabled = true;

            alert(
                "Thank you for responding. The blood bank has been notified."
            );
        }
    });


    // Logout
    document.querySelector(".logout")?.addEventListener("click", event => {
        if (!confirm("Are you sure you want to logout?")) {
            event.preventDefault();
        }
    });

});