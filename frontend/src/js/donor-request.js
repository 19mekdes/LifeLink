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
                                            class="respond-btn"
                                            data-request-id="${id}">
                                            Respond
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
                await api.post(
                    `/donors/requests/${requestId}/respond`,
                    {
                        response: "ACCEPTED"
                    }
                );


            console.log(
                "Request response:",
                result
            );


            button.textContent =
                "ACCEPTED";


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