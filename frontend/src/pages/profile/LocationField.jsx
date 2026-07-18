import { useEffect, useState } from "react";
import { Compass, Loader2, MapPin, X } from "lucide-react";
import {
  getLocationDetails,
  reverseLocation,
  searchLocations,
} from "../../api/locationApi";
import {
  queryPermissionState,
  setStoredPermissionState,
} from "../../utils/permissions";

function formatDisplay(value) {
  if (!value?.city) return "";
  return [value.city, value.state].filter(Boolean).join(", ");
}

function LocationField({
  value,
  onChange,
  label = "Location",
  placeholder = "Search your city or area",
  required = true,
  showCurrentLocation = true,
}) {
  const [text, setText] = useState(formatDisplay(value));
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(formatDisplay(value));
  }, [editing, value?.city, value?.state]);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2 || query === formatDisplay(value)) {
      setSuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        setSuggestions(await searchLocations(query));
        setError("");
      } catch {
        setSuggestions([]);
        setError("Couldn't load location suggestions");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [text, value?.city, value?.state]);

  const selectSuggestion = async (suggestion) => {
    try {
      setSearching(true);
      const location = await getLocationDetails(suggestion.id);

      // Some place results (rural areas, certain landmarks/POIs) resolve
      // without a usable city component. Rejecting those here — instead of
      // committing an empty city — matches the same guard the GPS path
      // already has below, and stops the input from silently reverting to
      // blank right after the user taps a suggestion.
      if (!location?.city) {
        setError("Couldn't find a city for that result — try a different search.");
        return;
      }

      setEditing(false);
      onChange(location);
      setText(formatDisplay(location));
      setSuggestions([]);
      setError("");
    } catch {
      setError("Couldn't load this location");
    } finally {
      setSearching(false);
    }
  };

  // If the user types a city and taps away (or the on-screen keyboard's
  // "Done"/"Go" doesn't fire a real Enter keydown, common on Android) without
  // explicitly tapping a suggestion, the field used to keep showing their
  // typed text while silently never actually saving a location — value.city
  // stayed "" the whole time. This commits the best available match on blur
  // instead of just abandoning whatever the user typed.
  const commitBestMatch = async () => {
    const query = text.trim();

    if (!query) {
      if (value?.city) onChange({ city: "", state: "", country: "", lat: null, lng: null });
      return;
    }

    if (query === formatDisplay(value)) return;

    if (suggestions[0]) {
      await selectSuggestion(suggestions[0]);
      return;
    }

    try {
      const results = await searchLocations(query);
      if (results?.[0]) await selectSuggestion(results[0]);
    } catch {
      // Leave the previously-saved value alone rather than wiping it just
      // because this lookup failed.
    }
  };

  const getDevicePosition = (options) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const useMyLocation = async () => {
    if (!navigator.geolocation) return setError("Location isn't supported on this device");
    const permission = await queryPermissionState("geolocation");
    if (permission === "denied") {
      return setError("Location access is off. Enable it in your device settings.");
    }

    setLocating(true);
    setError("");
    try {
      let position;
      try {
        position = await getDevicePosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000,
        });
      } catch (firstError) {
        if (firstError?.code === 1) throw firstError;
        position = await getDevicePosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      }

      setStoredPermissionState("geolocation", "granted");
      const location = await reverseLocation(
        position.coords.latitude,
        position.coords.longitude
      );
      if (!location?.city) throw new Error("Location unavailable");
      setEditing(false);
      onChange(location);
      setText(formatDisplay(location));
      setSuggestions([]);
      setError("");
    } catch (geoError) {
      if (geoError?.code === 1) {
        setStoredPermissionState("geolocation", "denied");
        setError("Location access denied. Allow it in your browser settings.");
      } else {
        setError("Current location unavailable. Search and select your city instead.");
      }
    } finally {
      setLocating(false);
    }
  };

  const hasValue = Boolean(value?.city);

  const clearLocation = () => {
    setEditing(false);
    setText("");
    setSuggestions([]);
    setError("");
    onChange({ city: "", state: "", country: "", lat: null, lng: null });
  };

  return (
    <div>
      <label className="mb-2 block text-[12px] font-bold text-[var(--imc-text-muted)]">
        {label} {required ? <span className="text-red-500">*</span> : <span className="font-medium text-[var(--imc-text-faint)]">(optional)</span>}
      </label>
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <MapPin size={19} className="pointer-events-none absolute left-4 top-[27px] -translate-y-1/2 text-[var(--imc-indigo-text)]" />
          <input
            value={text}
            onChange={(event) => {
              setEditing(true);
              setText(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && suggestions[0]) {
                event.preventDefault();
                selectSuggestion(suggestions[0]);
              }
            }}
            onBlur={() => {
              // Delayed so a tap on a suggestion button (which also blurs
              // this input) gets to run its own onClick/selectSuggestion
              // first — by the time this fires, `text` will already match
              // the freshly-selected value and this becomes a no-op.
              window.setTimeout(commitBestMatch, 200);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="h-[54px] w-full rounded-[16px] border border-[var(--imc-border)] bg-[var(--imc-surface)] pl-11 pr-10 text-[15px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)] focus:border-[var(--imc-indigo-text)]"
          />
          {searching && <Loader2 size={17} className="absolute right-4 top-[19px] animate-spin text-[var(--imc-indigo-text)]" />}
          {!searching && hasValue && (
            <button
              type="button"
              onClick={clearLocation}
              aria-label="Clear location"
              className="absolute right-3 top-[27px] -translate-y-1/2 rounded-full p-1 text-[var(--imc-text-faint)] active:scale-90"
            >
              <X size={16} />
            </button>
          )}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[60px] z-30 overflow-hidden rounded-2xl border border-[var(--imc-border)] bg-[var(--imc-surface)] shadow-xl">
              {suggestions.map((item) => (
                <button key={item.id} type="button" onClick={() => selectSuggestion(item)} className="block w-full border-b border-[var(--imc-border)] px-4 py-3 text-left text-[13px] font-bold text-[var(--imc-text)] last:border-0">{item.label}</button>
              ))}
            </div>
          )}
        </div>
        {showCurrentLocation && <button type="button" onClick={useMyLocation} disabled={locating} title="Use my current location" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] border border-[rgba(67,56,202,0.18)] bg-[rgba(67,56,202,0.08)] text-[var(--imc-indigo-text)] disabled:opacity-60">
          {locating ? <Loader2 size={20} className="animate-spin" /> : <Compass size={20} />}
        </button>}
      </div>
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  );
}

export default LocationField;
