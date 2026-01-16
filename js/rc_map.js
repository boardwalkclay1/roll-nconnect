// rc_map.js
// Roll ’n Connect — Hybrid Map Engine (OpenStreetMap + Emoji Markers)

const RC_MAP = (function () {
  const API_BASE = "";
  const POLL_INTERVAL = 10000; // 10s for presence / checkins

  let map;
  let userMarker = null;
  let spots = [];
  let markers = {};
  let currentSpot = null;
  let pollTimer = null;

  const sidebarEl = document.getElementById("mapSidebar");
  const sidebarToggleEl = document.getElementById("sidebarToggle");
  const spotListEl = document.getElementById("spotList");
  const infoCardEl = document.getElementById("infoCard");
  const infoNameEl = document.getElementById("infoName");
  const infoTypeEl = document.getElementById("infoType");
  const infoAmenitiesEl = document.getElementById("infoAmenities");
  const infoPeopleEl = document.getElementById("infoPeople");
  const infoReviewsEl = document.getElementById("infoReviews");
  const closeInfoEl = document.getElementById("closeInfo");
  const btnMyLocation = document.getElementById("btnMyLocation");
  const btnNearby = document.getElementById("btnNearby");
  const btnCheckIn = document.getElementById("btnCheckIn");
  const btnDirections = document.getElementById("btnDirections");
  const btnLeaveReview = document.getElementById("btnLeaveReview");

  function getUserId() {
    return localStorage.getItem("rc_user_id") || "demo-user";
  }

  async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("POST " + path + " failed");
    return res.json();
  }

  function initMap() {
    map = L.map("map", {
      zoomControl: true,
      attributionControl: false
    }).setView([33.749, -84.388], 12); // Atlanta default

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);
  }

  function emojiForType(type) {
    switch (type) {
      case "skatepark": return "🛹";
      case "rink": return "⛸";
      case "parking_garage": return "🅿️";
      case "college": return "🎓";
      case "plaza": return "🏬";
      case "big_lot_store": return "🏪";
      case "food": return "🍔";
      case "water": return "💧";
      default: return "📍";
    }
  }

  function createEmojiMarker(spot) {
    const emoji = emojiForType(spot.type);
    const icon = L.divIcon({
      className: "rc-emoji-marker",
      html: `<div style="
        font-size:22px;
        text-shadow:0 0 8px rgba(255,255,255,0.9);
        filter:drop-shadow(0 0 6px rgba(255,255,255,0.8));
      ">${emoji}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const m = L.marker([spot.lat, spot.lng], { icon }).addTo(map);
    m.on("click", () => openSpot(spot.spotId));
    return m;
  }

  async function loadSpots() {
    try {
      spots = await apiGet("/api/spots");
      renderMarkers();
      renderSidebar();
    } catch (e) {
      console.error(e);
    }
  }

  function renderMarkers() {
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};

    spots.forEach(spot => {
      markers[spot.spotId] = createEmojiMarker(spot);
    });
  }

  function distanceKm(aLat, aLng, bLat, bLng) {
    const R = 6371;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const la1 = aLat * Math.PI / 180;
    const la2 = bLat * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(la1) * Math.cos(la2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function renderSidebar(userPos = null) {
    spotListEl.innerHTML = "";

    let list = spots.slice();

    if (userPos) {
      list.forEach(s => {
        s._distance = distanceKm(userPos.lat, userPos.lng, s.lat, s.lng);
      });
      list.sort((a, b) => (a._distance || 9999) - (b._distance || 9999));
    }

    list.forEach(spot => {
      const div = document.createElement("div");
      div.className = "spot-list-item";
      div.innerHTML = `
        <strong>${emojiForType(spot.type)} ${spot.name}</strong><br>
        <span style="opacity:0.8;font-size:13px;">${spot.city || ""}</span>
        ${spot._distance != null ? `<br><span style="opacity:0.7;font-size:12px;">${spot._distance.toFixed(1)} km away</span>` : ""}
      `;
      div.onclick = () => {
        map.setView([spot.lat, spot.lng], 16);
        openSpot(spot.spotId);
      };
      spotListEl.appendChild(div);
    });
  }

  function toggleSidebar() {
    sidebarEl.classList.toggle("collapsed");
  }

  function showInfoCard(show) {
    if (window.innerWidth <= 900) {
      infoCardEl.style.display = show ? "block" : "none";
    } else {
      infoCardEl.style.display = show ? "block" : "none";
    }
  }

  async function openSpot(spotId) {
    try {
      const spot = await apiGet(`/api/spots/${spotId}`);
      currentSpot = spot;

      infoNameEl.textContent = `${emojiForType(spot.type)} ${spot.name}`;
      infoTypeEl.textContent = spot.typeLabel || spot.type;
      infoAmenitiesEl.textContent = spot.amenities && spot.amenities.length
        ? `Amenities: ${spot.amenities.join(", ")}`
        : "";

      await loadPeople(spot.spotId);
      await loadReviews(spot.spotId);

      showInfoCard(true);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadPeople(spotId) {
    try {
      const people = await apiGet(`/api/spots/${spotId}/people`);
      if (!people.length) {
        infoPeopleEl.innerHTML = `<p style="opacity:0.7;font-size:13px;">No one checked in right now.</p>`;
        return;
      }
      infoPeopleEl.innerHTML = people.map(p => `
        <div style="font-size:13px;margin-bottom:4px;">
          <strong>@${p.userId}</strong> <span style="opacity:0.7;">(${timeAgo(p.ts)})</span>
        </div>
      `).join("");
    } catch (e) {
      console.error(e);
      infoPeopleEl.innerHTML = `<p style="opacity:0.7;font-size:13px;">Unable to load people.</p>`;
    }
  }

  async function loadReviews(spotId) {
    try {
      const reviews = await apiGet(`/api/spots/${spotId}/reviews`);
      if (!reviews.length) {
        infoReviewsEl.innerHTML = `<p style="opacity:0.7;font-size:13px;">No reviews yet.</p>`;
        return;
      }
      infoReviewsEl.innerHTML = reviews.map(r => `
        <div style="font-size:13px;margin-bottom:6px;">
          <strong>@${r.userId}</strong> 
          <span>${"⭐".repeat(r.rating || 5)}</span><br>
          <span style="opacity:0.8;">${r.text}</span><br>
          <span style="opacity:0.6;font-size:11px;">${new Date(r.ts).toLocaleString()}</span>
        </div>
      `).join("");
    } catch (e) {
      console.error(e);
      infoReviewsEl.innerHTML = `<p style="opacity:0.7;font-size:13px;">Unable to load reviews.</p>`;
    }
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function locateUser(centerMap = false) {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;

      if (!userMarker) {
        userMarker = L.circleMarker([latitude, longitude], {
          radius: 7,
          color: "#00eaff",
          fillColor: "#00eaff",
          fillOpacity: 0.8
        }).addTo(map);
      } else {
        userMarker.setLatLng([latitude, longitude]);
      }

      if (centerMap) {
        map.setView([latitude, longitude], 15);
      }

      renderSidebar({ lat: latitude, lng: longitude });
    });
  }

  async function checkIn() {
    if (!currentSpot) {
      alert("Tap a spot first, then check in.");
      return;
    }

    const userId = getUserId();
    try {
      await apiPost(`/api/spots/${currentSpot.spotId}/checkin`, { userId });
      await loadPeople(currentSpot.spotId);
      alert("Checked in!");
    } catch (e) {
      console.error(e);
      alert("Unable to check in.");
    }
  }

  async function showNearbyRollers() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      try {
        const nearby = await apiGet(`/api/nearby?lat=${latitude}&lng=${longitude}`);
        if (!nearby.length) {
          alert("No nearby rollers right now.");
          return;
        }
        const names = nearby.map(n => `@${n.userId} (${Math.round(n.distance)}m)`).join("\n");
        alert("Nearby rollers:\n" + names);
      } catch (e) {
        console.error(e);
        alert("Unable to load nearby rollers.");
      }
    });
  }

  function openDirections() {
    if (!currentSpot) return;
    const lat = currentSpot.lat;
    const lng = currentSpot.lng;

    const isApple = /iPad|iPhone|Macintosh/.test(navigator.userAgent);
    if (isApple) {
      window.open(`http://maps.apple.com/?daddr=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  }

  async function leaveReview() {
    if (!currentSpot) {
      alert("Tap a spot first.");
      return;
    }

    const ratingStr = prompt("Rating (1-5 stars):", "5");
    if (!ratingStr) return;
    const rating = Math.max(1, Math.min(5, parseInt(ratingStr, 10) || 5));

    const text = prompt("Write your review:");
    if (!text) return;

    const userId = getUserId();
    try {
      await apiPost(`/api/spots/${currentSpot.spotId}/review`, {
        userId,
        rating,
        text
      });
      await loadReviews(currentSpot.spotId);
      alert("Review submitted!");
    } catch (e) {
      console.error(e);
      alert("Unable to submit review.");
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (currentSpot) {
        await loadPeople(currentSpot.spotId);
      }
    }, POLL_INTERVAL);
  }

  function bindUI() {
    sidebarToggleEl.onclick = toggleSidebar;
    closeInfoEl.onclick = () => showInfoCard(false);
    btnMyLocation.onclick = () => locateUser(true);
    btnCheckIn.onclick = checkIn;
    btnNearby.onclick = showNearbyRollers;
    btnDirections.onclick = openDirections;
    btnLeaveReview.onclick = leaveReview;

    window.addEventListener("resize", () => {
      if (window.innerWidth <= 900) {
        sidebarEl.classList.add("collapsed");
      } else {
        sidebarEl.classList.remove("collapsed");
      }
    });
  }

  async function init() {
    initMap();
    bindUI();
    locateUser(false);
    await loadSpots();
    startPolling();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { init };
})();
