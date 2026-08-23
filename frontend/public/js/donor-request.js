import api from './api/api.js';

console.log("Donor Request JS is working!");

// ==========================================
// HOSPITAL COORDINATES DATABASE
// ==========================================
const hospitalCoordinates = {
    "Black Lion Hospital": { lat: 9.0192, lng: 38.7525 },
    "Black Lion Teaching Hospital": { lat: 9.0192, lng: 38.7525 },
    "St. Paul Hospital": { lat: 9.0054, lng: 38.7636 },
    "Tikur Anbessa Hospital": { lat: 9.0109, lng: 38.7613 },
    "Zewditu Hospital": { lat: 9.0320, lng: 38.7469 },
    "Minilik Hospital": { lat: 9.0320, lng: 38.7469 },
    "St. Peter Hospital": { lat: 9.0350, lng: 38.7800 },
    "Bethlehem Hospital": { lat: 9.0150, lng: 38.7700 }
};

// Default: Addis Ababa center
const DEFAULT_CENTER = { lat: 9.0192, lng: 38.7525 };

function getHospitalCoords(hospitalName) {
    if (hospitalCoordinates[hospitalName]) {
        return hospitalCoordinates[hospitalName];
    }
    // Fuzzy match
    for (const [name, coords] of Object.entries(hospitalCoordinates)) {
        if (hospitalName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(hospitalName.toLowerCase())) {
            return coords;
        }
    }
    // Random offset from center for unknown hospitals
    return {
        lat: DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.04,
        lng: DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.04
    };
}

function getDirectionsUrl(hospitalName, lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(hospitalName)}`;
}


document.addEventListener("DOMContentLoaded", () => {

    const requestList =
        document.getElementById("requestList");

    const notificationCount =
        document.getElementById("notificationCount");

    let map = null;
    let markers = [];


    // ==========================================
    // INITIALIZE MAP
    // ==========================================

    function initMap() {
        const mapEl = document.getElementById("map");
        if (!mapEl) return;

        map = L.map("map").setView(
            [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
            13
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 18
        }).addTo(map);

        // Add user location marker
        const userIcon = L.divIcon({
            className: "user-marker",
            html: '<div style="width:16px;height:16px;background:#4285f4;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("<strong>Your Location</strong>");

        // Try to get real location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    map.setView([latitude, longitude], 13);
                    L.marker([latitude, longitude], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<strong>You are here</strong>")
                        .openPopup();
                },
                () => { /* Use default */ }
            );
        }
    }


    // ==========================================
    // ADD HOSPITAL MARKERS
    // ==========================================

    function addHospitalMarkers(requests) {
        if (!map) return;

        // Clear existing markers
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        const bloodIcon = L.divIcon({
            className: "blood-marker",
            html: '<div style="width:28px;height:28px;background:#7b1e2b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">🩸</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
        });

        const bounds = [];

        // Group requests by hospital
        const hospitalMap = {};
        requests.forEach(req => {
            const name = req.hospital?.user?.name || req.hospital?.name || "Hospital";
            if (!hospitalMap[name]) {
                hospitalMap[name] = {
                    name: name,
                    requests: [],
                    location: req.location || "",
                    hospital: req.hospital
                };
            }
            hospitalMap[name].requests.push(req);
        });

        Object.values(hospitalMap).forEach(hospital => {
            const coords = getHospitalCoords(hospital.name);
            const requestCount = hospital.requests.length;
            const bloodTypes = [...new Set(hospital.requests.map(r => r.bloodType.replace('_', '+')))].join(', ');
            const hasUrgent = hospital.requests.some(r => r.urgency === 'CRITICAL_EMERGENCY');

            const popupContent = `
                <div style="min-width:200px; font-family:Arial,sans-serif;">
                    <strong style="font-size:14px; color:#2d2424;">${hospital.name}</strong>
                    <br><small style="color:#6b7280;">${hospital.location}</small>
                    <hr style="margin:6px 0; border:none; border-top:1px solid #eee;">
                    <div style="font-size:12px; color:#555;">
                        <strong>${requestCount}</strong> request${requestCount > 1 ? 's' : ''} &bull; Types: <strong>${bloodTypes}</strong>
                        ${hasUrgent ? '<br><span style="color:#ef4444; font-weight:600;">⚠ URGENT</span>' : ''}
                    </div>
                    <a href="${getDirectionsUrl(hospital.name, coords.lat, coords.lng)}"
                       target="_blank"
                       style="display:inline-block; margin-top:8px; padding:6px 14px; background:#7b1e2b; color:white; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">
                        📍 Get Directions
                    </a>
                </div>
            `;

            const marker = L.marker([coords.lat, coords.lng], { icon: bloodIcon })
                .addTo(map)
                .bindPopup(popupContent);

            markers.push(marker);
            bounds.push([coords.lat, coords.lng]);
        });

        // Fit map to show all markers
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
    }


    // ==========================================
    // LOAD BLOOD REQUESTS
    // ==========================================

    async function loadRequests() {

        try {

            const data =
                await api.get("/donors/requests");

            console.log("BLOOD REQUESTS API DATA:", data);

            const requests =
                data?.data?.requests || [];

            if (!requestList) return;

            // Add markers to map
            addHospitalMarkers(requests);

            if (!requests.length) {

                requestList.innerHTML = `
                    <div class="empty-state" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <p style="font-size:16px;">No blood requests available.</p>
                        <small>You'll be notified when new requests match your blood type.</small>
                    </div>
                `;

                return;
            }

            requestList.innerHTML =
                requests.map(request => {

                    const id = request.id;
                    const bloodType = request.bloodType || "Unknown";
                    const hospital = request.hospital?.user?.name || request.hospital?.name || "Hospital";
                    const location = request.location || "Location unavailable";
                    const units = request.unitsRequired ?? 0;
                    const urgency = request.urgency || "NORMAL";
                    const urgencyClass = urgency.toLowerCase();
                    const coords = getHospitalCoords(hospital);

                    return `
                        <div class="request-card">
                            <div class="request-icon ${urgencyClass}-icon">
                                🩸
                            </div>
                            <div class="request-info">
                                <div class="request-title">
                                    <strong>${bloodType} Blood Needed</strong>
                                    <span>${units} Units</span>
                                </div>
                                <div class="request-location">
                                    <strong>${hospital}</strong>
                                    <span>| ${location}</span>
                                </div>
                            </div>
                            <div class="request-meta">
                                <span class="urgency ${urgencyClass}">${urgency}</span>
                            </div>
                            <a href="${getDirectionsUrl(hospital, coords.lat, coords.lng)}" target="_blank" class="view-details">
                                📍 Get Directions
                            </a>
                        </div>
                    `;

                }).join("");

        } catch (error) {

            console.error("Error loading blood requests:", error);
            requestList.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <p style="font-size:16px;">Failed to load blood requests.</p>
                    <small>Please try again later.</small>
                </div>
            `;

        }

    }


    // ==========================================
    // START
    // ==========================================

    initMap();
    loadRequests();

});