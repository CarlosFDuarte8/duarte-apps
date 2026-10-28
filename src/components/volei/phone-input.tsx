"use client";
import { useState, type ComponentProps } from "react";
import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import "./phone-input.css";
import countries from "./phone-countries.json";

export function PhoneInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parsePhoneNumberFromString(value, "BR");
  const [selected, setSelected] = useState<CountryCode>(
    parsed?.country ?? "BR",
  );
  const country = selected;
  const code = getCountryCallingCode(country);
  const national = value.startsWith("+")
    ? value.replace(/\D/g, "").slice(code.length)
    : value.replace(/\D/g, "");
  return (
    <span className="volley-phone-input">
      <NativeSelect
        aria-label="País do telefone"
        value={country}
        disabled={props.disabled}
        onChange={(e) => {
          const next = e.target.value as CountryCode;
          setSelected(next);
          onChange(
            national ? `+${getCountryCallingCode(next)}${national}` : "",
          );
        }}
      >
        {countries.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name} (+{item.callingCode})
          </option>
        ))}
      </NativeSelect>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={new AsYouType(country).input(national)}
        maxLength={28}
        placeholder={
          country === "BR" ? "(61) 99999-9999" : "Número do telefone"
        }
        onChange={(e) => {
          const input = e.target.value;
          if (input.trim().startsWith("+")) {
            const pasted = parsePhoneNumberFromString(input);
            if (pasted?.country) setSelected(pasted.country);
            onChange(`+${input.replace(/\D/g, "").slice(0, 15)}`);
          } else {
            const digits = input
              .replace(/\D/g, "")
              .slice(0, country === "BR" ? 11 : 15 - code.length);
            onChange(digits ? `+${code}${digits}` : "");
          }
        }}
      />
    </span>
  );
}
