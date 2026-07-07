import { useEffect, useRef, useState } from "react";
import { Compass, Loader2, MapPin } from "lucide-react";

const GMAPS_KEY = import.meta.env.VITE_GMAPS_BROWSER_KEY;

let mapsLoadPromise = null;

function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!GMAPS_KEY) return Promise.reject(new Error("Maps key missing"));
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("imc-gmaps-script");

    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.id = "imc-gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

function getComponent(components, type) {
  const match = components?.find((item) => item.types.includes(type));
  return match?.long_name || "";
}

function parseAddressComponents(components) {
  const city =
    getComponent(components, "sublocality_level_1") ||
    getComponent(components, "sublocality") ||
    getComponent(components, "locality") ||
    getComponent(components, "administrative_area_level_2") ||
    "";

  const state = getComponent(components, "administrative_area_level_1") || "";
  const country = getComponent(components, "country") || "India";

  return { city, state, country };
}

function formatDisplay(value) {
  if (!value?.city) return "";
  return [value.city, value.state].filter(Boolean).join(", ");
}

function LocationField({ value, onChange }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);

  const [text, setText] = useState(formatDisplay(value));
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Re-sync the display text when the parent's saved location changes
    // (e.g. once the profile finishes loading after this field has mounted).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(formatDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.city, value?.state]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          componentRestrictions: { country: "in" },
          fields: ["address_components", "geometry"],
        });

        listenerRef.current = autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (!place?.address_components) return;

          const parsed = parseAddressComponents(place.address_components);
          const lat = place.geometry?.location?.lat?.() ?? null;
          const lng = place.geometry?.location?.lng?.() ?? null;

          const next = { ...parsed, lat, lng };
          onChange(next);
          setText(formatDisplay(next));
          setError("");
        });
      })
      .catch(() => setError("Couldn't load location search"));

    return () => {
      cancelled = true;
      if (listenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listenerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location isn't supported on this device");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const google = await loadGoogleMaps();
          const geocoder = new google.maps.Geocoder();

          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setLocating(false);

              if (status !== "OK" || !results?.length) {
                setError("Couldn't detect your location");
                return;
              }

              const parsed = parseAddressComponents(results[0].address_components);
              const next = { ...parsed, lat: latitude, lng: longitude };

              onChange(next);
              setText(formatDisplay(next));
            }
          );
        } catch {
          setLocating(false);
          setError("Couldn't detect your location");
        }
      },
      () => {
        setLocating(false);
        setError("Location access denied. Enable it and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
        Location <span className="text-red-500">*</span>
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-indigo-text)]"
          />

          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search your city or area"
            autoComplete="off"
            className="h-[58px] w-full rounded-[20px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-4 text-[16px] font-black text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
          />
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my current location"
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[20px] border border-[var(--imc-border)] bg-[rgba(67,56,202,0.12)] text-[var(--imc-indigo-text)] active:scale-95 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Compass size={20} />
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-1.5 text-[11px] font-bold text-[#D92D20]">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] font-bold text-[var(--imc-text-faint)]">
          Search your city, or tap the compass to use your current location.
        </p>
      )}
    </div>
  );
}

export default LocationField;
