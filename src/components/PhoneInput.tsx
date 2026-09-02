import React, { useState, useEffect } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (fullE164: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Converts any incoming format (+2348012345678, 2348012345678, 8012345678, 08012345678)
 * to standard 11-digit local Nigerian display format starting with '0' (e.g. 08012345678).
 */
export const toLocalNigerianNumber = (val: string): string => {
  if (!val) return "";
  let digits = val.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) {
    digits = digits.slice(3);
  }
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";
  const local = "0" + digits;
  return local.slice(0, 11);
};

/**
 * Converts 11-digit local Nigerian number (e.g. 08012345678) to E.164 (+2348012345678).
 */
export const toE164NigerianNumber = (localVal: string): string => {
  const digits = localVal.replace(/[^\d]/g, "");
  if (!digits) return "";
  const national = digits.replace(/^0+/, "");
  return `+234${national}`;
};

/**
 * Validates whether a number is a valid 11-digit Nigerian phone number starting with '0'.
 */
export const isValidNigerianPhone = (val: string): boolean => {
  const local = toLocalNigerianNumber(val);
  return /^0\d{10}$/.test(local);
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "0801 234 5678",
  className = "",
  style,
  disabled = false,
}) => {
  const [localNumber, setLocalNumber] = useState(toLocalNigerianNumber(value));

  useEffect(() => {
    setLocalNumber(toLocalNigerianNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Sanitize non-digits and enforce a strict maximum of 11 local digits
    const cleanDigits = raw.replace(/[^\d]/g, "").slice(0, 11);
    setLocalNumber(cleanDigits);

    if (!cleanDigits) {
      onChange("");
    } else {
      onChange(toE164NigerianNumber(cleanDigits));
    }
  };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3.5 ${className}`}
      style={{
        background: "hsl(var(--background))",
        boxShadow: "var(--shadow-inset)",
        height: 52,
        ...style,
      }}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
        <span className="text-lg">🇳🇬</span>
        <span className="text-xs font-bold text-foreground">+234</span>
      </div>

      <div className="h-5 w-px bg-border flex-shrink-0" />

      <input
        type="tel"
        inputMode="numeric"
        value={localNumber}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={11}
        className="flex-1 bg-transparent text-foreground text-sm font-medium outline-none placeholder:text-muted-foreground/60 min-w-0"
      />
    </div>
  );
};

export default PhoneInput;
