console.log("Donor Request JS is working!");

document.addEventListener("DOMContentLoaded", () => {

    const requestList =
        document.getElementById("requestList");

    const notificationCount =
        document.getElementById("notificationCount");


    // ==========================================
    // LOAD BLOOD REQUESTS
    // ==========================================

    async function loadRequests() {

        try {

            const data =
                await apiRequest(
                    "/api/donors/requests"
                );

            console.log(
                "Blood requests:",
                data
            );


            const requests =
                Array.isArray(data)
                    ? data
                    : data.requests || [];


            if (!requestList) return;


            if (!requests.length) {

                requestList.innerHTML = `
                    <p>
                        No blood requests available.
                    </p>
                `;

                return;
            }


            requestList.innerHTML =
                requests.map(request => {

                    const id =
                        request.id ||
                        request.requestId ||
                        request._id;


                    const bloodType =
                        request.bloodType ||
                        "Unknown";


                    const hospital =
                        request.hospital ||
                        request.hospitalName ||
                        "Hospital";


                    const location =
                        request.location ||
                        "Location unavailable";


                    const urgency =
                        request.urgency ||
                        request.priority ||
                        "Normal";


                    const status =
                        request.status ||
                        "Pending";


                    return `
                        <div class="request-card">

                            <div>

                                <strong>
                                    ${request.title ||
                                    "Blood Request"}
                                </strong>

                                <p>
                                    Blood Type:
                                    ${bloodType}
                                </p>

                                <small>
                                    ${hospital}
                                    ${location !==
                                    "Location unavailable"
                                        ? " • " + location
                                        : ""}
                                </small>

                                <small>
                                    Urgency:
                                    ${urgency}
                                </small>

                            </div>


                            <div>

                                <span>
                                    ${status}
                                </span>


                                ${
                                    status.toLowerCase() ===
                                    "pending"

                                    ? `
                                        <button
                                            class="respond-btn"
                                            data-request-id="${id}">
                                            Respond
                                        </button>
                                      `

                                    : `
                                        <button
                                            class="respond-btn"
                                            disabled>
                                            ${status}
                                        </button>
                                      `
                                }

                            </div>

                        </div>
                    `;

                }).join("");


            // Add response button listeners

            document
                .querySelectorAll(".respond-btn")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const requestId =
                                button.dataset.requestId;

                            respondToRequest(
                                requestId,
                                button
                            );

                        }
                    );

                });


        } catch (error) {

            console.error(
                "Failed to load blood requests:",
                error
            );


            if (requestList) {

                requestList.innerHTML = `
                    <p>
                        Unable to load blood requests.
                    </p>
                `;
            }
        }
    }


    // ==========================================
    // RESPOND TO REQUEST
    // ==========================================

    async function respondToRequest(
        requestId,
        button
    ) {

        if (!requestId) {

            console.error(
                "Missing request ID."
            );

            return;
        }


        const confirmed =
            confirm(
                "Would you like to respond to this blood request?"
            );


        if (!confirmed) return;


        try {

            button.disabled = true;

            button.textContent =
                "Sending...";


            const result =
                await apiRequest(
                    `/api/donors/requests/${requestId}/respond`,
                    {
                        method: "POST",

                        body: JSON.stringify({
                            response: "accepted"
                        })
                    }
                );


            console.log(
                "Request response:",
                result
            );


            button.textContent =
                "Response Sent";


            alert(
                "Thank you. Your response has been sent to the blood bank."
            );


        } catch (error) {

            console.error(
                "Failed to respond to request:",
                error
            );


            button.disabled = false;

            button.textContent =
                "Respond";


            alert(
                "Unable to respond to this request. Please try again."
            );
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

    loadRequests();
    loadNotificationCount();

});