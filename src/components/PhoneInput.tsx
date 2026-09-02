import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface CountryCode {
  code: string; // e.g. "+234"
  flag: string; // e.g. "🇳🇬"
  name: string; // e.g. "Nigeria"
}

export const COUNTRIES: CountryCode[] = [
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "+1",   flag: "🇺🇸", name: "United States / Canada" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "+225", flag: "🇨🇮", name: "Ivory Coast" },
  { code: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+20",  flag: "🇪🇬", name: "Egypt" },
  { code: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
  { code: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "+243", flag: "🇨🇩", name: "DR Congo" },
  { code: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "+264", flag: "🇳🇦", name: "Namibia" },
  { code: "+230", flag: "🇲🇺", name: "Mauritius" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "+34",  flag: "🇪🇸", name: "Spain" },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "+32",  flag: "🇧🇪", name: "Belgium" },
  { code: "+41",  flag: "🇨🇭", name: "Switzerland" },
  { code: "+43",  flag: "🇦🇹", name: "Austria" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+30",  flag: "🇬🇷", name: "Greece" },
  { code: "+48",  flag: "🇵🇱", name: "Poland" },
  { code: "+420", flag: "🇨🇿", name: "Czechia" },
  { code: "+36",  flag: "🇭🇺", name: "Hungary" },
  { code: "+40",  flag: "🇷🇴", name: "Romania" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "+47",  flag: "🇳🇴", name: "Norway" },
  { code: "+45",  flag: "🇩🇰", name: "Denmark" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+90",  flag: "🇹🇷", name: "Turkey" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "+98",  flag: "🇮🇷", name: "Iran" },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+66",  flag: "🇹🇭", name: "Thailand" },
  { code: "+84",  flag: "🇻🇳", name: "Vietnam" },
  { code: "+63",  flag: "🇵🇭", name: "Philippines" },
  { code: "+62",  flag: "🇮🇩", name: "Indonesia" },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "+82",  flag: "🇰🇷", name: "South Korea" },
  { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "+52",  flag: "🇲🇽", name: "Mexico" },
  { code: "+54",  flag: "🇦🇷", name: "Argentina" },
  { code: "+56",  flag: "🇨🇱", name: "Chile" },
  { code: "+57",  flag: "🇨🇴", name: "Colombia" },
  { code: "+51",  flag: "🇵🇪", name: "Peru" },
  { code: "+58",  flag: "🇻🇪", name: "Venezuela" },
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+1809",flag: "🇩🇴", name: "Dominican Republic" },
  { code: "+1876",flag: "🇯🇲", name: "Jamaica" },
  { code: "+1868",flag: "🇹🇹", name: "Trinidad & Tobago" },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullE164: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const parsePhoneNumber = (val: string) => {
  if (!val) return { dialCode: "+234", national: "" };
  const clean = val.trim();
  if (clean.startsWith("+")) {
    // Sort COUNTRIES by dial code length descending so longer codes (e.g. +1809, +234) match before shorter (+1)
    const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    const matched = sorted.find(c => clean.startsWith(c.code));
    if (matched) {
      return { dialCode: matched.code, national: clean.slice(matched.code.length).replace(/^0+/, "") };
    }
    const plusMatch = clean.match(/^(\+\d{1,4})(.*)$/);
    if (plusMatch) return { dialCode: plusMatch[1], national: plusMatch[2].replace(/^0+/, "") };
  }
  // Local number (e.g. 08031234567 or 2348031234567) -> default to +234
  if (clean.startsWith("234") && clean.length >= 12) {
    return { dialCode: "+234", national: clean.slice(3) };
  }
  return { dialCode: "+234", national: clean.replace(/^0+/, "") };
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "801 234 5678",
  className = "",
  style,
  disabled = false,
}) => {
  const parsed = parsePhoneNumber(value);
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [national, setNational] = useState(parsed.national);

  useEffect(() => {
    const updated = parsePhoneNumber(value);
    setDialCode(updated.dialCode);
    setNational(updated.national);
  }, [value]);

  const handleDialCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setDialCode(newCode);
    emitValue(newCode, national);
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanDigits = e.target.value.replace(/[^\d]/g, "");
    setNational(cleanDigits);
    emitValue(dialCode, cleanDigits);
  };

  const emitValue = (code: string, num: string) => {
    if (!num) {
      onChange("");
    } else {
      onChange(`${code}${num.replace(/^0+/, "")}`);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === dialCode) || { code: dialCode, flag: "🌐", name: "International" };

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl px-3 ${className}`}
      style={{
        background: "hsl(var(--background))",
        boxShadow: "var(--shadow-inset)",
        height: 52,
        ...style,
      }}
    >
      <div className="relative flex items-center gap-1 cursor-pointer flex-shrink-0">
        <span className="text-base">{selectedCountry.flag}</span>
        <span className="text-xs font-bold text-foreground">{dialCode}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
        <select
          value={dialCode}
          onChange={handleDialCodeChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Select country code"
        >
          {COUNTRIES.map(c => (
            <option key={c.code + c.name} value={c.code}>
              {c.flag} {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <div className="h-5 w-px bg-border flex-shrink-0" />

      <input
        type="tel"
        inputMode="numeric"
        value={national}
        onChange={handleNationalChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-foreground text-sm font-medium outline-none placeholder:text-muted-foreground/60 min-w-0"
      />
    </div>
  );
};

export default PhoneInput;
