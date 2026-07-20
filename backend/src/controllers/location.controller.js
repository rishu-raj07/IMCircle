import axios from "axios";
import https from "https";
import dns from "dns";

const mapsKey = () =>
  process.env.GMAPS_SERVER_KEY ||
  process.env.GOOGLE_MAPS_SERVER_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

// The production VPS is dual-stack (IPv4 + IPv6), and Node prefers IPv6 by
// default whenever a host resolves to both — maps.googleapis.com does.
// process-level `dns.setDefaultResultOrder("ipv4first")` (set in server.js)
// did NOT fix this in practice: the outbound request still went out over
// IPv6 regardless, so it's not relied on here. The Google Maps server key
// is restricted to this server's IPv4 address only (IPv6 addresses are
// less stable to keep in sync as an allowlist entry across VPS
// providers/reboots), so every call below explicitly forces IPv4 at the
// connection level via a custom `lookup`, independent of whatever the
// process-wide DNS default resolves to. Confirmed on the server itself:
// `curl -4 ...` against this same endpoint/key succeeded immediately,
// plain `curl` (IPv6-first) failed with "This IP ... is not authorized" —
// same fix, applied where Node actually makes the call.
const ipv4OnlyAgent = new https.Agent({
  lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
});

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
    country: component(components, "country"),
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

    // No country restriction (find any user's city, not just India) and no
    // `types: "(cities)"` restriction — that excluded anything below a
    // whole city, like a neighborhood or landmark (e.g. "Badarpur
    // border"), which real users do search for.
    const { data } = await axios.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
      timeout: 6000,
      httpsAgent: ipv4OnlyAgent,
      params: { input, key: mapsKey() },
    });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message || `Location provider status: ${data.status}`);
    }

    res.status(200).json({
      success: true,
      suggestions: (data.predictions || []).slice(0, 6).map((item) => ({
        id: item.place_id,
        label: item.description,
      })),
    });
  } catch (error) {
    console.error("Search locations error:", error?.message || error);
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
      httpsAgent: ipv4OnlyAgent,
      params: { place_id: placeId, key: mapsKey(), fields: "address_components,geometry" },
    });
    if (data.status !== "OK" || !data.result) {
      throw new Error(data.error_message || `Location provider status: ${data.status}`);
    }
    res.status(200).json({ success: true, location: normalizePlace(data.result) });
  } catch (error) {
    console.error("Get location details error:", error?.message || error);
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
      httpsAgent: ipv4OnlyAgent,
      params: { latlng: `${lat},${lng}`, key: mapsKey() },
    });
    if (data.status !== "OK" || !data.results?.length) {
      throw new Error(data.error_message || `Location provider status: ${data.status}`);
    }
    res.status(200).json({
      success: true,
      location: { ...normalizePlace(data.results[0]), lat, lng },
    });
  } catch (error) {
    console.error("Reverse location error:", error?.message || error);
    res.status(502).json({ success: false, message: "Could not detect this location." });
  }
};
