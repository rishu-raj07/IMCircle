import { MapPin } from "lucide-react";

const indianLocations = [
  "Andhra Pradesh, India",
  "Arunachal Pradesh, India",
  "Assam, India",
  "Bihar, India",
  "Chhattisgarh, India",
  "Goa, India",
  "Gujarat, India",
  "Haryana, India",
  "Himachal Pradesh, India",
  "Jharkhand, India",
  "Karnataka, India",
  "Kerala, India",
  "Madhya Pradesh, India",
  "Maharashtra, India",
  "Manipur, India",
  "Meghalaya, India",
  "Mizoram, India",
  "Nagaland, India",
  "Odisha, India",
  "Punjab, India",
  "Rajasthan, India",
  "Sikkim, India",
  "Tamil Nadu, India",
  "Telangana, India",
  "Tripura, India",
  "Uttar Pradesh, India",
  "Uttarakhand, India",
  "West Bengal, India",
  "Delhi, India",
  "Jammu and Kashmir, India",
  "Ladakh, India",
  "Chandigarh, India",
  "Puducherry, India",
  "Andaman and Nicobar Islands, India",
  "Dadra and Nagar Haveli and Daman and Diu, India",
  "Lakshadweep, India",
];

function StateSelector({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-black text-[var(--imc-text-muted)]">
        Location <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <MapPin
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--imc-indigo-text)]"
        />

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[58px] w-full appearance-none rounded-[20px] border border-[rgba(18,20,28,0.14)] bg-[var(--imc-surface)] px-11 text-[16px] font-black text-[var(--imc-text)] outline-none focus:border-[#4338CA]"
        >
          <option value="">Select state</option>

          {indianLocations.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--imc-text-muted)]">
          ▼
        </span>
      </div>
    </div>
  );
}

export default StateSelector;