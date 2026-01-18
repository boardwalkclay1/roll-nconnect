// js/rc_events_core.js
// Roll ’n Connect — Events Engine (Skate first, then public)

window.RC_EVENTS = (function () {
  let skateEvents = [];
  let publicEvents = [];
  let userLocation = null;

  function init() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        loadSkateEvents();
        loadPublicEvents();
      }, () => {
        userLocation = null;
        loadSkateEvents();
        loadPublicEvents();
      });
    } else {
      loadSkateEvents();
      loadPublicEvents();
    }
  }

  function loadSkateEvents() {
    fetch("data/skate_events.json")
      .then(r => r.json())
      .then(data => {
        skateEvents = data || [];
        render();
      })
      .catch(() => { skateEvents = []; render(); });
  }

  function loadPublicEvents() {
    // Later: your backend proxy to Ticketmaster/Eventbrite/etc.
    // For now, just a placeholder JSON.
    fetch("data/public_events.json")
      .then(r => r.json())
      .then(data => {
        publicEvents = data || [];
        render();
      })
      .catch(() => { publicEvents = []; render(); });
  }

  function render() {
    const skateEl = document.getElementById("skateEventsList");
    const publicEl = document.getElementById("publicEventsList");
    if (!skateEl || !publicEl) return;

    skateEl.innerHTML = skateEvents.length
      ? skateEvents.map(e => renderEventCard(e, true)).join("")
      : "<p style='opacity:0.7;'>No skate events yet.</p>";

    publicEl.innerHTML = publicEvents.length
      ? publicEvents.map(e => renderEventCard(e, false)).join("")
      : "<p style='opacity:0.7;'>No public events found.</p>";
  }

  function renderEventCard(evt, isSkate) {
    const distanceText = userLocation && evt.lat && evt.lng
      ? formatDistance(distanceKm(userLocation[0], userLocation[1], evt.lat, evt.lng))
      : "";

    const nearbySpots = (window.RC_MAP && evt.lat && evt.lng)
      ? window.RC_MAP.findNearbySpots(evt.lat, evt.lng, 2)
      : [];

    const nearbyHTML = nearbySpots.length
      ? `
        <div style="margin-top:6px;font-size:12px;opacity:0.9;">
          <strong>Nearby skate spots:</strong><br>
          ${nearbySpots.slice(0, 3).map(s => `${s.name} (${s.category})`).join("<br>")}
        </div>
      `
      : "";

    const mapLink = evt.lat && evt.lng
      ? `<button class="btn-small" onclick="window.location.href='find-spots.html'">View on Map</button>`
      : "";

    const hostLink = isSkate && evt.hostId
      ? `<a href="profile.html?id=${evt.hostId}" style="font-size:12px;text-decoration:underline;">View host</a>`
      : "";

    return `
      <div class="glass" style="padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;opacity:0.8;">${isSkate ? "Skate Event" : "Event"}</div>
            <h3 style="margin:2px 0;">${evt.title}</h3>
            <div style="font-size:13px;opacity:0.8;">
              ${evt.city || ""} ${distanceText ? " • " + distanceText : ""}
            </div>
            <div style="font-size:13px;margin-top:4px;">
              ${formatDateTime(evt.start)}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
            ${mapLink}
            ${hostLink}
          </div>
        </div>
        <p style="margin-top:8px;font-size:13px;opacity:0.9;">${evt.description || ""}</p>
        ${nearbyHTML}
      </div>
    `;
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatDistance(km) {
    if (km == null) return "";
    if (km < 1) return `${(km * 1000).toFixed(0)} m away`;
    return `${km.toFixed(1)} km away`;
  }

  document.addEventListener("DOMContentLoaded", init);

  return {};
})();
