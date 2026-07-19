import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

const socials = [
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "LinkedIn profile URL",
    icon: <FaLinkedin size={24} color="#0A66C2" />,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "Instagram profile URL",
    icon: <FaInstagram size={24} color="#E4405F" />,
  },
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "X profile URL",
    icon: <FaXTwitter size={24} color="#000000" />,
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "Facebook profile URL",
    icon: <FaFacebook size={24} color="#1877F2" />,
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "YouTube channel URL",
    icon: <FaYoutube size={24} color="#FF0000" />,
  },
];

function SocialLinksPage({ value, onBack, onSave }) {
  const [links, setLinks] = useState({
    linkedin: "",
    instagram: "",
    twitter: "",
    facebook: "",
    youtube: "",
  });

  useEffect(() => {
    setLinks({
      linkedin: value?.linkedin || "",
      instagram: value?.instagram || "",
      twitter: value?.twitter || "",
      facebook: value?.facebook || "",
      youtube: value?.youtube || "",
    });
  }, [value]);

  const updateLink = (key, val) => {
    setLinks((prev) => ({
      ...prev,
      [key]: val.slice(0, 180),
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 pb-8">
        <div className="-mx-5 flex h-[72px] items-center justify-between border-b border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface-2)] px-5">
          <button type="button" onClick={onBack}>
            <ArrowLeft size={27} />
          </button>

          <h1 className="text-[23px] font-black text-[var(--imc-text)]">
            Social Links
          </h1>

          <button
            type="button"
            onClick={() => onSave(links)}
            className="text-[var(--imc-indigo-text)]"
          >
            <CheckCircle2 size={34} />
          </button>
        </div>

        <div className="pt-6">
          <h2 className="text-[25px] font-black tracking-[-0.5px] text-[var(--imc-text)]">
            Add your online presence
          </h2>

          <p className="mt-1 text-[13px] font-bold leading-5 text-[var(--imc-text-muted)]">
            These links are optional and help people trust your profile.
          </p>

          <div className="mt-6 space-y-5">
            {socials.map((item) => (
              <div key={item.key}>
                <label className="mb-2 block text-[13px] font-black text-[#2B2E38]">
                  {item.label}
                </label>

                <div className="flex h-[58px] items-center gap-3 rounded-[20px] border border-[rgba(18,20,28,0.14)] bg-[var(--imc-surface)] px-4 focus-within:border-[#4338CA]">
                  {item.icon}

                  <input
                    value={links[item.key]}
                    onChange={(e) => updateLink(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full bg-transparent text-[15px] font-bold text-[var(--imc-text)] outline-none placeholder:text-[var(--imc-text-faint)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onSave(links)}
            className="mt-8 flex h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#4338CA] via-[#4338CA] to-[#4338CA] text-[16px] font-black text-white shadow-xl shadow-[rgba(67,56,202,0.18)]"
          >
            Save Links
          </button>
        </div>
      </div>
    </div>
  );
}

export default SocialLinksPage;