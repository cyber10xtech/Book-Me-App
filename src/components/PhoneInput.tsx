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
  { code: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
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
  const matched = COUNTRIES.find(c => clean.startsWith(c.code));
  if (matched) {
    return { dialCode: matched.code, national: clean.slice(matched.code.length).replace(/^0+/, "") };
  }
  if (clean.startsWith("+")) {
    // Other international dial code
    const plusMatch = clean.match(/^(\+\d{1,4})(.*)$/);
    if (plusMatch) return { dialCode: plusMatch[1], national: plusMatch[2].replace(/^0+/, "") };
  }
  // Local number (e.g. 08031234567) -> default to +234
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

  const selectedCountry = COUNTRIES.find(c => c.code === dialCode) || COUNTRIES[0];

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
