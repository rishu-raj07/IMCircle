import api from "./axios";

const browserKey = String(import.meta.env.VITE_GMAPS_BROWSER_KEY || "").trim();

let mapsPromise;

const loadGoogleMaps = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Location suggestions are only available in the browser."));
  }

  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (!browserKey) return Promise.reject(new Error("Location service is not configured."));
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__imcircleMapsReady_${Date.now()}`;
    const existing = document.querySelector('script[data-imcircle-google-maps="true"]');

    const cleanup = () => {
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      mapsPromise = undefined;
      reject(new Error("Location service took too long to load."));
    }, 15000);

    window[callbackName] = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Location service could not be loaded."));
    };

    if (existing) {
      const poll = window.setInterval(() => {
        if (!window.google?.maps) return;
        window.clearInterval(poll);
        window.clearTimeout(timeoutId);
        cleanup();
        resolve(window.google.maps);
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.dataset.imcircleGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey
    )}&libraries=places&v=weekly&loading=async&callback=${callbackName}`;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      mapsPromise = undefined;
      reject(new Error("Location service could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
};

const componentValue = (components, type, short = false) => {
  const component = (components || []).find((item) => item.types?.includes(type));
  if (!component) return "";
  return short
    ? component.shortText || component.short_name || component.longText || component.long_name || ""
    : component.longText || component.long_name || component.shortText || component.short_name || "";
};

const normalizePlace = (components, location, formattedAddress = "") => {
  const city =
    componentValue(components, "locality") ||
    componentValue(components, "postal_town") ||
    componentValue(components, "administrative_area_level_3") ||
    componentValue(components, "administrative_area_level_2");
  const state = componentValue(components, "administrative_area_level_1");
  const country = componentValue(components, "country");
  const latitude = typeof location?.lat === "function" ? location.lat() : location?.lat;
  const longitude = typeof location?.lng === "function" ? location.lng() : location?.lng;

  return {
    city,
    state,
    country,
    label: formattedAddress || [city, state, country].filter(Boolean).join(", "),
    lat: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    lng: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
  };
};

const searchWithBrowserMaps = async (query) => {
  const maps = await loadGoogleMaps();
  const places = await maps.importLibrary?.("places");
  const AutocompleteSuggestion =
    places?.AutocompleteSuggestion || maps.places?.AutocompleteSuggestion;

  if (AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    try {
      // No includedRegionCodes restriction — users anywhere in the world
      // need to be able to find their own city, not just India (this was
      // the actual cause of "can't find my city" reports: anyone outside
      // India got zero results no matter what they typed).
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        language: "en",
      });

      return (response?.suggestions || [])
        .map((suggestion) => suggestion.placePrediction)
        .filter(Boolean)
        .map((prediction) => ({
          id: prediction.placeId,
          label: prediction.text?.toString?.() || String(prediction.text || ""),
        }));
    } catch {
      // Some existing Google projects have the legacy Places API enabled but
      // not Places API (New). Continue with the compatible browser service.
    }
  }

  // No `types` restriction — "(cities)" excluded anything below a whole
  // city (a neighborhood, sub-locality, or landmark like "Badarpur
  // border"), which was the actual cause of "it won't find my area even
  // though it's a real place" reports. Full geocode results cover cities,
  // states, sub-localities, and neighborhoods all together.
  return new Promise((resolve, reject) => {
    const service = new maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
      },
      (predictions, status) => {
        if (
          status === maps.places.PlacesServiceStatus.OK ||
          status === maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          resolve(
            (predictions || []).map((prediction) => ({
              id: prediction.place_id,
              label: prediction.description,
            }))
          );
          return;
        }
        reject(new Error("Location suggestions are temporarily unavailable."));
      }
    );
  });
};

const detailsWithBrowserMaps = async (placeId) => {
  const maps = await loadGoogleMaps();
  const places = await maps.importLibrary?.("places");
  const Place = places?.Place || maps.places?.Place;

  if (Place) {
    try {
      const place = new Place({ id: placeId });
      await place.fetchFields({ fields: ["addressComponents", "formattedAddress", "location"] });
      return normalizePlace(place.addressComponents, place.location, place.formattedAddress);
    } catch {
      // Fall through for projects configured with the legacy Places API.
    }
  }

  return new Promise((resolve, reject) => {
    const service = new maps.places.PlacesService(document.createElement("div"));
    service.getDetails(
      { placeId, fields: ["address_components", "formatted_address", "geometry"] },
      (place, status) => {
        if (status === maps.places.PlacesServiceStatus.OK && place) {
          resolve(
            normalizePlace(
              place.address_components,
              place.geometry?.location,
              place.formatted_address
            )
          );
          return;
        }
        reject(new Error("That location could not be selected."));
      }
    );
  });
};

const reverseWithBrowserMaps = async (lat, lng) => {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        resolve(
          normalizePlace(
            results[0].address_components,
            results[0].geometry?.location,
            results[0].formatted_address
          )
        );
        return;
      }
      reject(new Error("Your location could not be identified."));
    });
  });
};

export const searchLocations = async (query) => {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) return [];

  if (browserKey) return searchWithBrowserMaps(trimmed);

  const response = await api.get("/location/search", { params: { q: trimmed } });
  return response.data?.suggestions || [];
};

export const getLocationDetails = async (placeId) => {
  if (!placeId) throw new Error("Select a location from the suggestions.");

  if (browserKey) return detailsWithBrowserMaps(placeId);

  const response = await api.get("/location/details", { params: { placeId } });
  return response.data?.location;
};

export const reverseLocation = async (lat, lng) => {
  if (browserKey) return reverseWithBrowserMaps(lat, lng);

  const response = await api.get("/location/reverse", { params: { lat, lng } });
  return response.data?.location;
};
