// js/rc_map_core.js
// Roll ’n Connect — Shared Map Core (OSM + Spots + Trails)

window.RC_MAP = (function () {
  let map;
  let spots = [];
  let spotMarkers = {};
  let trails = [];
  let trailLayers = {};
  let activeFilters = new Set();      // category keys
  let visibleSpotIds = null;          // null = all, or array of spotIds

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

  // ---------------- INIT ----------------
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    map = L.map("map", { zoomControl: true })
      .setView([33.7488, -84.3880], 12); // Atlanta default

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

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

  // ---------------- RENDERING ----------------
  function renderSpotsOnMap() {
    if (!map) return;

    Object.values(spotMarkers).forEach(m => map.removeLayer(m));
    spotMarkers = {};

    spots.forEach(spot => {
      if (!spot.lat || !spot.lng) return;

      const cat = spot.category || spot.type || "spot";
      const meta = CATEGORY_META[cat] || { emoji: "📍", color: "#FFFFFF" };

      const marker = L.marker([spot.lat, spot.lng], { title: spot.name }).addTo(map);

      marker.bindTooltip(`${meta.emoji} ${spot.name}`, {
        permanent: false,
        direction: "top"
      });

      spotMarkers[spot.spotId] = marker;
    });

    applyFiltersToMap();
  }

  function renderTrailsOnMap() {
    if (!map) return;

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

      trailLayers[trail.trailId] = layer;
    });

    applyFiltersToMap();
  }

  // ---------------- FILTERING ----------------
  function applyFiltersToMap() {
    if (!map) return;

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

    // Trails (only show when "trail" filter is active or no filters)
    Object.entries(trailLayers).forEach(([trailId, layer]) => {
      const matchesFilter = !hasFilters || activeFilters.has("trail");
      if (matchesFilter) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    });
  }

  function setFilter(filterKey) {
    // "all" clears filters
    if (filterKey === "all") {
      activeFilters.clear();
    } else {
      activeFilters.clear();
      activeFilters.add(filterKey);
    }
    applyFiltersToMap();
  }

  // ---------------- PUBLIC HELPERS ----------------
  function setCenter(lat, lng, zoom = 13) {
    if (!map) return;
    map.setView([lat, lng], zoom);
  }

  function focusSpot(spotId) {
    if (!map) return;
    const spot = spots.find(s => s.spotId === spotId);
    if (!spot || !spot.lat || !spot.lng) return;
    map.setView([spot.lat, spot.lng], 16);
  }

  function setVisibleSpots(spotIds) {
    visibleSpotIds = Array.isArray(spotIds) ? spotIds : null;
    applyFiltersToMap();
  }

  // Haversine distance
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

  // Find nearby spots for events, etc.
  function findNearbySpots(lat, lng, radiusKm = 2) {
    return spots
      .filter(s => s.lat && s.lng)
      .map(s => ({
        ...s,
        distance: distanceKm(lat, lng, s.lat, s.lng)
      }))
      .filter(s => s.distance != null && s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  // Highlight nearby spots on the map (used by "Use My Location")
  function highlightNearbySpots(lat, lng, radiusKm = 2) {
    if (!map) return;
    const nearby = findNearbySpots(lat, lng, radiusKm);
    const ids = nearby.map(s => s.spotId);
    setVisibleSpots(ids);
    setCenter(lat, lng, 14);
  }

  // ---------------- AUTO-INIT ----------------
  document.addEventListener("DOMContentLoaded", initMap);

  // ---------------- PUBLIC API ----------------
  return {
    setFilter,
    setCenter,
    focusSpot,
    setVisibleSpots,
    findNearbySpots,
    highlightNearbySpots
  };
})();
