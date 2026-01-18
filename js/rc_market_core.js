// js/rc_map_core.js
// Roll ’n Connect — OSM + JSON Map Engine

window.RC_MAP = (function () {
  let map;
  let userLocation = null;

  let spots = [];      // from spots.json (your custom spots)
  let trails = [];     // from trails.json (optional)
  let osmSpots = [];   // from OSM (live)
  let markers = [];
  let currentFilter = "all";

  const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  function initMap() {
    map = L.map("map", {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([33.749, -84.388], 12); // default ATL

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    loadLocalData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        map.setView(userLocation, 13);
        fetchOSMData(userLocation[0], userLocation[1]);
      }, () => {
        // still fetch OSM around default center
        const c = map.getCenter();
        fetchOSMData(c.lat, c.lng);
      });
    } else {
      const c = map.getCenter();
      fetchOSMData(c.lat, c.lng);
    }
  }

  function loadLocalData() {
    // Your curated spots
    fetch("data/spots.json")
      .then(r => r.json())
      .then(data => {
        spots = data || [];
        renderMarkers();
      })
      .catch(() => { spots = []; });

    // Optional trails
    fetch("data/trails.json")
      .then(r => r.json())
      .then(data => {
        trails = data || [];
        renderMarkers();
      })
      .catch(() => { trails = []; });
  }

  function fetchOSMData(lat, lng) {
    const radius = 10000; // 10km
    const query = `
      [out:json];
      (
        node["leisure"="skatepark"](around:${radius},${lat},${lng});
        node["leisure"="park"](around:${radius},${lat},${lng});
        node["highway"="cycleway"](around:${radius},${lat},${lng});
        node["amenity"="drinking_water"](around:${radius},${lat},${lng});
        node["amenity"="parking"](around:${radius},${lat},${lng});
        node["amenity"="college"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
      );
      out center;
    `;

    const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

    fetch(url)
      .then(r => r.json())
      .then(data => {
        osmSpots = (data.elements || []).map(el => {
          const tags = el.tags || {};
          return {
            id: "OSM_" + el.id,
            name: tags.name || "Unnamed",
            lat: el.lat,
            lng: el.lon,
            category: mapOSMCategory(tags),
            city: tags["addr:city"] || "",
            smoothness: null,
            source: "osm",
          };
        });
        renderMarkers();
      })
      .catch(() => { osmSpots = []; });
  }

  function mapOSMCategory(tags) {
    if (tags.leisure === "skatepark") return "skatepark";
    if (tags.leisure === "park") return "park";
    if (tags.highway === "cycleway") return "trail";
    if (tags.amenity === "drinking_water") return "water";
    if (tags.amenity === "parking") return "parking";
    if (tags.amenity === "college") return "college";
    if (tags.amenity === "hospital") return "hospital";
    return "other";
  }

  function renderMarkers() {
    if (!map) return;

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const all = mergeAllSpots();
    const filtered = all.filter(spot => {
      if (currentFilter === "all") return true;
      if (currentFilter === "trail") return spot.category === "trail";
      return spot.category === currentFilter;
    });

    filtered.forEach(spot => {
      if (!spot.lat || !spot.lng) return;
      const marker = L.marker([spot.lat, spot.lng]).addTo(map);
      marker.bindPopup(renderPopupHTML(spot));
      markers.push(marker);
    });
  }

  function mergeAllSpots() {
    const localSpots = spots.map(s => ({ ...s, source: "local" }));
    const localTrails = trails.map(t => ({
      id: t.id,
      name: t.name,
      lat: t.lat,
      lng: t.lng,
      category: "trail",
      city: t.city || "",
      smoothness: t.smoothness || null,
      source: "local_trail",
    }));
    return [...localSpots, ...localTrails, ...osmSpots];
  }

  function renderPopupHTML(spot) {
    const smooth = spot.smoothness != null ? `Smoothness: ${spot.smoothness.toFixed(1)}` : "";
    const city = spot.city ? `<div style="opacity:0.8;font-size:12px;">${spot.city}</div>` : "";
    const link = spot.id && !String(spot.id).startsWith("OSM_")
      ? `<a href="spot.html?id=${spot.id}" style="font-size:12px;text-decoration:underline;">View details</a>`
      : "";

    return `
      <div style="font-size:13px;">
        <strong>${spot.name}</strong>
        ${city}
        <div style="margin-top:4px;">Category: ${spot.category}</div>
        ${smooth ? `<div>${smooth}</div>` : ""}
        <div style="margin-top:6px;">${link}</div>
      </div>
    `;
  }

  function setFilter(category) {
    currentFilter = category || "all";
    renderMarkers();
  }

  function setCenter(lat, lng, zoom = 13) {
    if (!map) return;
    map.setView([lat, lng], zoom);
  }

  function highlightNearbySpots(lat, lng, radiusKm = 5) {
    const all = mergeAllSpots();
    const nearby = all.filter(s => distanceKm(lat, lng, s.lat, s.lng) <= radiusKm);
    // For now just center on first nearby; later you can style markers differently
    if (nearby.length) {
      setCenter(lat, lng, 13);
    }
    return nearby;
  }

  function findNearbySpots(lat, lng, radiusKm = 2) {
    const all = mergeAllSpots();
    return all.filter(s => distanceKm(lat, lng, s.lat, s.lng) <= radiusKm);
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
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

  document.addEventListener("DOMContentLoaded", () => {
    const mapEl = document.getElementById("map");
    if (mapEl) initMap();
  });

  return {
    setFilter,
    setCenter,
    highlightNearbySpots,
    findNearbySpots,
  };
})();
