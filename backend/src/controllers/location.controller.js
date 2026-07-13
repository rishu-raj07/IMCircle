import axios from "axios";

const mapsKey = () =>
  process.env.GMAPS_SERVER_KEY ||
  process.env.GOOGLE_MAPS_SERVER_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

function component(components = [], type) {
  return components.find((item) => item.types?.includes(type))?.long_name || "";
}

function normalizePlace(result = {}) {
  const components = result.address_components || [];
  return {
    city:
      component(components, "sublocality_level_1") ||
      component(components, "locality") ||
      component(components, "administrative_area_level_2") ||
      "",
    state: component(components, "administrative_area_level_1"),
    country: component(components, "country") || "India",
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
  };
}

function requireKey(res) {
  if (mapsKey()) return true;
  res.status(503).json({ success: false, message: "Location search is not configured." });
  return false;
}

export const searchLocations = async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const input = String(req.query.q || "").trim().slice(0, 120);
    if (input.length < 2) return res.status(200).json({ success: true, suggestions: [] });

    const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
      timeout: 6000,
      params: { input, key: mapsKey(), components: "country:in", types: "(cities)" },
    });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error("Location provider unavailable");
    }

    res.status(200).json({
      success: true,
      suggestions: (data.predictions || []).slice(0, 6).map((item) => ({
        id: item.place_id,
        label: item.description,
      })),
    });
  } catch {
    res.status(502).json({ success: false, message: "Could not search locations right now." });
  }
};

export const getLocationDetails = async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const placeId = String(req.query.placeId || "").trim().slice(0, 220);
    if (!placeId) return res.status(400).json({ success: false, message: "Place is required." });

    const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
      timeout: 6000,
      params: { place_id: placeId, key: mapsKey(), fields: "address_components,geometry" },
    });
    if (data.status !== "OK" || !data.result) throw new Error("Location unavailable");
    res.status(200).json({ success: true, location: normalizePlace(data.result) });
  } catch {
    res.status(502).json({ success: false, message: "Could not load this location." });
  }
};

export const reverseLocation = async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    const { data } = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      timeout: 6000,
      params: { latlng: `${lat},${lng}`, key: mapsKey() },
    });
    if (data.status !== "OK" || !data.results?.length) throw new Error("Location unavailable");
    res.status(200).json({
      success: true,
      location: { ...normalizePlace(data.results[0]), lat, lng },
    });
  } catch {
    res.status(502).json({ success: false, message: "Could not detect this location." });
  }
};
