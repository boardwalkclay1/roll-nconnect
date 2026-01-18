// js/rc_map.js
// Roll ’n Connect – Unified OSM + JSON Map Engine (Final Polished Version)

window.RC_MAP = (function () {
  let map;

  // Data sources
  let spots = [];
  let trails = [];

  // Rendered layers
  let spotMarkers = {};
  let trailLayers = {};

  // Filters
  let activeFilter = "all";
  let visibleSpotIds = null;

  // Info card references
  const infoCard = {
    el: null,
    name: null,
    type: null,
    amenities: null,
    people: null,
    reviews: null,
    btnDirections: null,
    btnLeaveReview: null,
    currentSpot: null
  };

  // Category metadata
  const CATEGORY_META = {
    water:         { emoji: "💧", color: "#4FC3F7" },
    food:          { emoji: "🍔", color: "#FFB74D" },
    plaza:         { emoji: "🏬", color: "#BA68C8" },
    big_lot:       { emoji: "🏪", color: "#A1887F" },
    parking_garage:{ emoji: "🅿️", color: "#90A4AE" },
    hospital:      { emoji: "🏥", color: "#EF5350" },
    college:       { emoji: "🎓", color: "#42A5F5" },
    rink:          { emoji: "⛸", color: "#80CBC4" },
    park:          { emoji: "🌳", color: "#66BB6A" },
    skatepark:     { emoji: "🛹", color: "#FF7043" },
    trail:         { emoji: "🛣️", color: "#FFCA28" }
  };

  // Initialize map
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    map = L.map("map", { zoomControl: true })
      .setView([33.7488, -84.3880], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    wireInfoCard();
    wireButtons();
    wireDropdownFilter();
    loadData();
  }

  // Load spots + trails
  async function loadData() {
    try {
      const [spotsRes, trailsRes] = await Promise.all([
        fetch("/api/spots"),
        fetch("/api/trails")
      ]);

      spots = await spotsRes.json();
      trails = trailsRes.ok ? await trailsRes.json() : [];

      renderSpots();
      renderTrails();
    } catch (err) {
      console.error("Error loading map data", err);
    }
  }

  // Render spots
  function renderSpots() {
    Object.values(spotMarkers).forEach(m => map.removeLayer(m));
    spotMarkers = {};

    spots.forEach(spot => {
      if (!spot.lat || !spot.lng) return;

      const cat = spot.category || "spot";
      const meta = CATEGORY_META[cat] || { emoji: "📍", color: "#FFF" };

      const marker = L.marker([spot.lat, spot.lng], { title: spot.name })
        .addTo(map);

      marker.bindTooltip(`${meta.emoji} ${spot.name}`, {
        direction: "top"
      });

      marker.on("click", () => openInfoCard(spot));

      spotMarkers[spot.spotId] = marker;
    });

    applyFilters();
  }

  // Render trails
  function renderTrails() {
    Object.values(trailLayers).forEach(l => map.removeLayer(l));
    trailLayers = {};

    trails.forEach(trail => {
      if (!trail.points || !trail.points.length) return;

      const latlngs = trail.points.map(p => [p.lat, p.lng]);

      const layer = L.polyline(latlngs, {
        color: CATEGORY_META.trail.color,
        weight: 4,
        opacity: 0.85
      }).addTo(map);

      layer.on("click", () => {
        if (trail.spotId) {
          const spot = spots.find(s => s.spotId === trail.spotId);
          if (spot) openInfoCard(spot);
        }
      });

      trailLayers[trail.trailId] = layer;
    });

    applyFilters();
  }

  // Dropdown filter
  function wireDropdownFilter() {
    const select = document.getElementById("spotFilterSelect");
    if (!select) return;

    select.onchange = () => {
      activeFilter = select.value;
      applyFilters();
    };
  }

  // Apply filters
  function applyFilters() {
    const filter = activeFilter;

    // Spots
    Object.entries(spotMarkers).forEach(([spotId, marker]) => {
      const spot = spots.find(s => s.spotId === spotId);
      if (!spot) return;

      const matchesFilter = filter === "all" || spot.category === filter;
      const matchesVisible = !visibleSpotIds || visibleSpotIds.includes(spot.spotId);

      if (matchesFilter && matchesVisible) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      }
    });

    // Trails
    Object.entries(trailLayers).forEach(([trailId, layer]) => {
      const trail = trails.find(t => t.trailId === trailId);
      if (!trail) return;

      const matchesFilter = filter === "all" || filter === "trail";

      if (matchesFilter) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    });
  }

  // Info card
  function wireInfoCard() {
    const card = document.getElementById("infoCard");
    if (!card) return;

    infoCard.el = card;
    infoCard.name = document.getElementById("infoName");
    infoCard.type = document.getElementById("infoType");
    infoCard.amenities = document.getElementById("infoAmenities");
    infoCard.people = document.getElementById("infoPeople");
    infoCard.reviews = document.getElementById("infoReviews");
    infoCard.btnDirections = document.getElementById("btnDirections");
    infoCard.btnLeaveReview = document.getElementById("btnLeaveReview");

    document.getElementById("closeInfo").onclick = () => {
      card.style.display = "none";
      infoCard.currentSpot = null;
    };

    infoCard.btnDirections.onclick = () => {
      if (!infoCard.currentSpot) return;
      const { lat, lng } = infoCard.currentSpot;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    };

    infoCard.btnLeaveReview.onclick = async () => {
      if (!infoCard.currentSpot) return;
      const text = prompt("Leave a quick review:");
      if (!text) return;

      await fetch("/api/reviews/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: infoCard.currentSpot.spotId,
          text
        })
      });

      loadReviews(infoCard.currentSpot.spotId);
    };
  }

  async function openInfoCard(spot) {
    infoCard.currentSpot = spot;

    infoCard.name.textContent = spot.name;
    infoCard.type.textContent = `${spot.category || ""} • ${spot.city || ""}`;
    infoCard.amenities.textContent = spot.description || "";

    infoCard.people.innerHTML = spot.peopleHere?.length
      ? spot.peopleHere.map(p => `<div>${p.name}</div>`).join("")
      : "<span style='opacity:0.7;'>No one checked in right now.</span>";

    infoCard.reviews.innerHTML = "<span style='opacity:0.7;'>Loading reviews…</span>";

    infoCard.el.style.display = "block";

    await loadReviews(spot.spotId);
  }

  async function loadReviews(spotId) {
    const res = await fetch(`/api/reviews?spotId=${spotId}`);
    const reviews = res.ok ? await res.json() : [];

    infoCard.reviews.innerHTML = reviews.length
      ? reviews.map(r => `
        <div style="margin-bottom:8px;">
          <strong>${r.author || "Skater"}</strong><br>
          <span style="opacity:0.8;">${r.text}</span>
        </div>
      `).join("")
      : "<span style='opacity:0.7;'>No reviews yet.</span>";
  }

  // Buttons
  function wireButtons() {
    const btnMyLocation = document.getElementById("btnMyLocation");
    const btnNearby = document.getElementById("btnNearby");
    const btnCheckIn = document.getElementById("btnCheckIn");
    const btnAddSpot = document.getElementById("btnAddSpot");

    btnMyLocation.onclick = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      });
    };

    btnNearby.onclick = () => {
      alert("Nearby rollers will highlight active users soon.");
    };

    btnCheckIn.onclick = async () => {
      navigator.geolocation.getCurrentPosition(async pos => {
        await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
        });
        alert("Checked in!");
      });
    };

    btnAddSpot.onclick = () => startAddSpotFlow();
  }

  // Add spot flow
  function startAddSpotFlow() {
    alert("Click on the map to place a new spot.");

    const clickHandler = async (e) => {
      map.off("click", clickHandler);

      const name = prompt("Spot name:");
      if (!name) return;

      const category = prompt("Category:", "skatepark");
      const description = prompt("Short description:");

      const res = await fetch("/api/spots/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description,
          lat: e.latlng.lat,
          lng: e.latlng.lng
        })
      });

      const newSpot = await res.json();
      spots.push(newSpot);
      renderSpots();
    };

    map.on("click", clickHandler);
  }

  // Public API
  function focusSpot(spotId) {
    const spot = spots.find(s => s.spotId === spotId);
    if (!spot) return;
    map.setView([spot.lat, spot.lng], 16);
    openInfoCard(spot);
  }

  function setVisibleSpots(ids) {
    visibleSpotIds = Array.isArray(ids) ? ids : null;
    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", initMap);

  return {
    focusSpot,
    setVisibleSpots
  };
})();
