import api from './api/api.js';

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
                await api.get("/donors/requests");

            console.log("BLOOD REQUESTS API DATA:", data);
            console.log(
                "Blood requests response:",
                data
            );


            // Backend response:
            // {
            //     success: true,
            //     data: {
            //         requests: [],
            //         pagination: {}
            //     }
            // }

            const requests =
                data?.data?.requests || [];


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
                        request.id;


                    const bloodType =
                        request.bloodType ||
                        "Unknown";


                    const hospital =
                        request.hospital?.user?.name ||
                        request.hospital?.name ||
                        "Hospital";


                    const location =
                        request.location ||
                        "Location unavailable";


                    const urgency =
                        request.urgency ||
                        "Normal";


                    const status =
                        request.status ||
                        "PENDING";


                    const userResponse =
                        request.userResponse;


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
                            : ""
                        }
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


         ${userResponse
                            ? `
        <button
            class="respond-btn"
            disabled>
            ${userResponse}
        </button>
    `
                            : `
        <button
            class="respond-btn accept-btn"
            data-request-id="${id}"
            data-response="ACCEPTED">
            Accept
        </button>

        <button
            class="respond-btn reject-btn"
            data-request-id="${id}"
            data-response="REJECTED">
            Reject
        </button>
    `
                        }

                            </div>

                        </div>
                    `;

                }).join("");


            // ==========================================
            // RESPONSE BUTTONS
            // ==========================================

            document
                .querySelectorAll(
                    ".respond-btn[data-request-id]"
                )
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const requestId =
                                button.dataset.requestId;

                            const response =
                                button.dataset.response;

                            respondToRequest(
                                requestId,
                                response,
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
        response,
        button
    ) {

        if (!requestId || !response) {

            console.error(
                "Missing request ID or response."
            );

            return;
        }


        const action =
            response === "ACCEPTED"
                ? "accept"
                : "reject";


        const confirmed =
            confirm(
                `Are you sure you want to ${action} this blood request?`
            );


        if (!confirmed) {
            return;
        }


        try {

            button.disabled = true;

            button.textContent =
                response === "ACCEPTED"
                    ? "Accepting..."
                    : "Rejecting...";


            const result =
                await api.post(
                    `/donors/requests/${requestId}/respond`,
                    {
                        response: response
                    }
                );


            console.log(
                "Request response:",
                result
            );


            if (!result?.success) {

                throw new Error(
                    result?.message ||
                    "Request response failed."
                );

            }


            button.textContent =
                response;


            // Disable the other button
            const requestCard =
                button.closest(".request-card");

            if (requestCard) {

                requestCard
                    .querySelectorAll(
                        ".respond-btn[data-request-id]"
                    )
                    .forEach(otherButton => {

                        otherButton.disabled = true;

                    });

            }


            alert(
                response === "ACCEPTED"
                    ? "You accepted this blood request."
                    : "You rejected this blood request."
            );


        } catch (error) {

            console.error(
                "Failed to respond to request:",
                error
            );


            button.disabled = false;

            button.textContent =
                response === "ACCEPTED"
                    ? "Accept"
                    : "Reject";


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
                await api.get(
                    "/donors/notifications"
                );


            console.log(
                "Request page notification response:",
                data
            );


            const unread =
                data?.data?.unreadCount || 0;


            if (notificationCount) {

                notificationCount.textContent =
                    unread;

            }


            const topNotificationCount =
                document.getElementById(
                    "topNotificationCount"
                );


            if (topNotificationCount) {

                topNotificationCount.textContent =
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