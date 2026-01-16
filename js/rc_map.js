// js/rc_map.js
// Roll ’n Connect – unified map engine

// Global namespace so pages can talk to the map
window.RC_MAP = (function () {
  let map;
  let spots = [];
  let spotMarkers = {};
  let trails = [];
  let trailLayers = {};
  let activeFilters = new Set(); // category keys
  let visibleSpotIds = null; // null = all, or array of spotIds

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

  // Category → emoji + color
  const CATEGORY_META = {
    water:        { emoji: "💧", color: "#4FC3F7" },
    food:         { emoji: "🍔", color: "#FFB74D" },
    plaza:        { emoji: "🏬", color: "#BA68C8" },
    big_lot:      { emoji: "🏪", color: "#A1887F" },
    parking_garage:{ emoji: "🅿️", color: "#90A4AE" },
    hospital:     { emoji: "🏥", color: "#EF5350" },
    college:      { emoji: "🎓", color: "#42A5F5" },
    rink:         { emoji: "⛸", color: "#80CBC4" },
    park:         { emoji: "🌳", color: "#66BB6A" },
    skatepark:    { emoji: "🛹", color: "#FF7043" },
    trail:        { emoji: "🛣️", color: "#FFCA28" }
  };

  // Initialize map
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    map = L.map("map", {
      zoomControl: true
    }).setView([33.7488, -84.3880], 12); // Atlanta default

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    // Info card wiring
    wireInfoCard();

    // UI buttons
    wireButtons();

    // Filter chips
    wireFilterChips();

    // Load data
    loadSpotsAndTrails();
  }

  async function loadSpotsAndTrails() {
    try {
      const [spotsRes, trailsRes] = await Promise.all([
        fetch("/api/spots"),
        fetch("/api/trails")
      ]);

      spots = await spotsRes.json();
      trails = trailsRes.ok ? await trailsRes.json() : [];

      renderSpotsOnMap();
      renderTrailsOnMap();
    } catch (err) {
      console.error("Error loading spots/trails", err);
    }
  }

  function renderSpotsOnMap() {
    // Clear existing markers
    Object.values(spotMarkers).forEach(m => map.removeLayer(m));
    spotMarkers = {};

    spots.forEach(spot => {
      if (!spot.lat || !spot.lng) return;

      const cat = spot.category || spot.type || "spot";
      const meta = CATEGORY_META[cat] || { emoji: "📍", color: "#FFFFFF" };

      const marker = L.marker([spot.lat, spot.lng], {
        title: spot.name
      }).addTo(map);

      marker.bindTooltip(`${meta.emoji} ${spot.name}`, {
        permanent: false,
        direction: "top"
      });

      marker.on("click", () => {
        openInfoCard(spot);
      });

      spotMarkers[spot.spotId] = marker;
    });

    applyFiltersToMap();
  }

  function renderTrailsOnMap() {
    Object.values(trailLayers).forEach(l => map.removeLayer(l));
    trailLayers = {};

    trails.forEach(trail => {
      if (!trail.points || !trail.points.length) return;

      const latlngs = trail.points.map(p => [p.lat, p.lng]);
      const layer = L.polyline(latlngs, {
        color: CATEGORY_META.trail.color,
        weight: 4,
        opacity: 0.8
      }).addTo(map);

      layer.on("click", () => {
        if (trail.spotId) {
          const spot = spots.find(s => s.spotId === trail.spotId);
          if (spot) openInfoCard(spot);
        }
      });

      trailLayers[trail.trailId] = layer;
    });

    applyFiltersToMap();
  }

  // Filters
  function wireFilterChips() {
    const bar = document.getElementById("filterBar");
    if (!bar) return;

    const chips = bar.querySelectorAll(".rc-chip");
    chips.forEach(chip => {
      const key = chip.getAttribute("data-filter");
      chip.addEventListener("click", () => {
        if (activeFilters.has(key)) {
          activeFilters.delete(key);
          chip.classList.remove("active");
        } else {
          activeFilters.add(key);
          chip.classList.add("active");
        }
        applyFiltersToMap();
      });
    });
  }

  function applyFiltersToMap() {
    const hasFilters = activeFilters.size > 0;

    // Spots
    Object.entries(spotMarkers).forEach(([spotId, marker]) => {
      const spot = spots.find(s => s.spotId === spotId);
      if (!spot) return;

      const cat = spot.category || spot.type || "spot";
      const matchesFilter = !hasFilters || activeFilters.has(cat);
      const matchesVisible =
        !visibleSpotIds || visibleSpotIds.includes(spot.spotId);

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

      const matchesFilter =
        !hasFilters || activeFilters.has("trail");

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

    const closeBtn = document.getElementById("closeInfo");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        card.style.display = "none";
        infoCard.currentSpot = null;
      });
    }

    if (infoCard.btnDirections) {
      infoCard.btnDirections.addEventListener("click", () => {
        if (!infoCard.currentSpot) return;
        const { lat, lng } = infoCard.currentSpot;
        if (!lat || !lng) return;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, "_blank");
      });
    }

    if (infoCard.btnLeaveReview) {
      infoCard.btnLeaveReview.addEventListener("click", async () => {
        if (!infoCard.currentSpot) return;
        const text = prompt("Leave a quick review:");
        if (!text) return;
        try {
          await fetch("/api/reviews/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spotId: infoCard.currentSpot.spotId,
              text
            })
          });
          loadReviewsForSpot(infoCard.currentSpot.spotId);
        } catch (err) {
          console.error("Error leaving review", err);
        }
      });
    }
  }

  async function openInfoCard(spot) {
    if (!infoCard.el) return;
    infoCard.currentSpot = spot;

    infoCard.name.textContent = spot.name || "Spot";
    infoCard.type.textContent = `${spot.type || ""} • ${spot.city || ""}`;
    infoCard.amenities.textContent = spot.description || "";

    infoCard.people.innerHTML = spot.peopleHere && spot.peopleHere.length
      ? spot.peopleHere.map(p => `<div>${p.name || "Skater"}</div>`).join("")
      : "<span style='opacity:0.7;'>No one checked in right now.</span>";

    infoCard.reviews.innerHTML = "<span style='opacity:0.7;'>Loading reviews…</span>";
    infoCard.el.style.display = "block";

    await loadReviewsForSpot(spot.spotId);
  }

  async function loadReviewsForSpot(spotId) {
    if (!infoCard.reviews) return;
    try {
      const res = await fetch(`/api/reviews?spotId=${encodeURIComponent(spotId)}`);
      const reviews = res.ok ? await res.json() : [];
      if (!reviews.length) {
        infoCard.reviews.innerHTML = "<span style='opacity:0.7;'>No reviews yet.</span>";
        return;
      }
      infoCard.reviews.innerHTML = reviews.map(r => `
        <div style="margin-bottom:8px;">
          <strong>${r.author || "Skater"}</strong><br>
          <span style="opacity:0.8;">${r.text}</span>
        </div>
      `).join("");
    } catch (err) {
      console.error("Error loading reviews", err);
      infoCard.reviews.innerHTML = "<span style='opacity:0.7;'>Error loading reviews.</span>";
    }
  }

  // Buttons
  function wireButtons() {
    const btnMyLocation = document.getElementById("btnMyLocation");
    const btnNearby = document.getElementById("btnNearby");
    const btnCheckIn = document.getElementById("btnCheckIn");
    const btnAddSpot = document.getElementById("btnAddSpot");
    const btnAddTrail = document.getElementById("btnAddTrail");

    if (btnMyLocation) {
      btnMyLocation.addEventListener("click", () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 15);
        });
      });
    }

    if (btnNearby) {
      btnNearby.addEventListener("click", () => {
        alert("Nearby rollers feature would highlight active users on the map.");
      });
    }

    if (btnCheckIn) {
      btnCheckIn.addEventListener("click", async () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude, longitude } = pos.coords;
          try {
            await fetch("/api/checkin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: latitude, lng: longitude })
            });
            alert("Checked in!");
          } catch (err) {
            console.error("Error checking in", err);
          }
        });
      });
    }

    if (btnAddSpot) {
      btnAddSpot.addEventListener("click", () => {
        startAddSpotFlow();
      });
    }

    if (btnAddTrail) {
      btnAddTrail.addEventListener("click", () => {
        startAddTrailFlow();
      });
    }
  }

  function startAddSpotFlow() {
    alert("Click on the map to place a new spot.");
    const clickHandler = async (e) => {
      map.off("click", clickHandler);
      const name = prompt("Spot name:");
      if (!name) return;
      const type = prompt("Category (water, food, plaza, big_lot, parking_garage, hospital, college, rink, park, skatepark):", "skatepark");
      const description = prompt("Short description:");

      try {
        const res = await fetch("/api/spots/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: type,
            description,
            lat: e.latlng.lat,
            lng: e.latlng.lng
          })
        });
        const newSpot = await res.json();
        spots.push(newSpot);
        renderSpotsOnMap();
      } catch (err) {
        console.error("Error adding spot", err);
      }
    };
    map.on("click", clickHandler);
  }

  function startAddTrailFlow() {
    alert("Click multiple points on the map to draw a trail. Double-click to finish.");
    let points = [];
    let tempLine = null;

    const clickHandler = (e) => {
      points.push([e.latlng.lat, e.latlng.lng]);
      if (tempLine) {
        tempLine.setLatLngs(points);
      } else {
        tempLine = L.polyline(points, {
          color: CATEGORY_META.trail.color,
          weight: 4,
          opacity: 0.8,
          dashArray: "5,5"
        }).addTo(map);
      }
    };

    const dblClickHandler = async () => {
      map.off("click", clickHandler);
      map.off("dblclick", dblClickHandler);
      if (tempLine) {
        map.removeLayer(tempLine);
      }
      if (points.length < 2) return;

      const name = prompt("Trail name:");
      if (!name) return;

      try {
        const res = await fetch("/api/trails/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            points: points.map(p => ({ lat: p[0], lng: p[1] }))
          })
        });
        const newTrail = await res.json();
        trails.push(newTrail);
        renderTrailsOnMap();
      } catch (err) {
        console.error("Error adding trail", err);
      }
    };

    map.on("click", clickHandler);
    map.on("dblclick", dblClickHandler);
  }

  // Public API for pages

  function focusSpot(spotId) {
    const spot = spots.find(s => s.spotId === spotId);
    if (!spot || !spot.lat || !spot.lng) return;
    map.setView([spot.lat, spot.lng], 16);
    openInfoCard(spot);
  }

  function setVisibleSpots(spotIds) {
    visibleSpotIds = Array.isArray(spotIds) ? spotIds : null;
    applyFiltersToMap();
  }

  // Auto-init when DOM is ready
  document.addEventListener("DOMContentLoaded", initMap);

  return {
    focusSpot,
    setVisibleSpots
  };
})();
