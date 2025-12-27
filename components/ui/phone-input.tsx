"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { phoneCountries, defaultPhoneCountry, type PhoneCountry } from "@/lib/data/phone-countries";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder,
  className,
  disabled,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(defaultPhoneCountry);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(defaultPhoneCountry.dialCode);
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Parse initial value and update when value prop changes
  useEffect(() => {
    if (!value) {
      if (phoneNumber) setPhoneNumber("");
      return;
    }

    // Try to find country code in value
    const foundCountry = phoneCountries.find((country) => 
      value.startsWith(country.dialCode)
    );
    
    if (foundCountry) {
      const number = value.replace(foundCountry.dialCode, "").trim().replace(/\D/g, "");
      setSelectedCountry(foundCountry);
      setCountryCode(foundCountry.dialCode);
      setPhoneNumber(number);
    } else {
      // Assume default country, extract just numbers
      const number = value.replace(/\D/g, "");
      setPhoneNumber(number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleCountryChange = (country: PhoneCountry) => {
    setSelectedCountry(country);
    setCountryCode(country.dialCode);
    // Clear phone number when country changes
    setPhoneNumber("");
    setCountrySelectOpen(false);
    setCountrySearch("");
    // Update parent with empty value
    if (onChange) {
      onChange("");
    }
  };

  // Filter countries based on search
  const filteredCountries = phoneCountries.filter((country) => {
    const searchLower = countrySearch.toLowerCase();
    return (
      country.name.toLowerCase().includes(searchLower) ||
      country.dialCode.includes(searchLower) ||
      country.code.toLowerCase().includes(searchLower)
    );
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // Remove all non-digit characters
    input = input.replace(/\D/g, "");
    
    // Limit to max length for selected country
    input = input.substring(0, selectedCountry.maxLength);
    
    setPhoneNumber(input);
    
    // Immediately update parent
    if (onChange) {
      const fullNumber = input 
        ? `${countryCode} ${input}`.trim()
        : "";
      onChange(fullNumber);
    }
  };

  // Format display value based on country
  const getDisplayValue = (): string => {
    if (!phoneNumber) return "";
    
    // For Turkey: 5XX XXX XX XX format
    if (selectedCountry.code === "TR") {
      const cleaned = phoneNumber.replace(/\D/g, "");
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
    }
    
    // For US: (XXX) XXX-XXXX format
    if (selectedCountry.code === "US") {
      const cleaned = phoneNumber.replace(/\D/g, "");
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
    
    // Default: just show numbers with spaces every 3 digits
    const cleaned = phoneNumber.replace(/\D/g, "");
    return cleaned.replace(/(\d{3})(?=\d)/g, "$1 ");
  };

  const displayValue = getDisplayValue();

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={countrySelectOpen} onOpenChange={setCountrySelectOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={countrySelectOpen}
            disabled={disabled}
            className="w-[140px] shrink-0 justify-between h-11"
          >
            <div className="flex items-center gap-2">
              <img
                src={`https://flagcdn.com/w20/${selectedCountry.flag.toLowerCase()}.png`}
                alt={selectedCountry.name}
                className="h-4 w-6 object-cover rounded-sm"
                loading="lazy"
              />
              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-white border border-zinc-200 shadow-lg" align="start">
          <div className="flex items-center border-b border-zinc-200 bg-white px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
            <Input
              placeholder="Search country or code..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-1 bg-white">
              {filteredCountries.length === 0 ? (
                <div className="py-6 text-center text-sm text-zinc-500">
                  No countries found.
                </div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryChange(country)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-zinc-100 text-zinc-900",
                      selectedCountry.code === country.code && "bg-zinc-100"
                    )}
                  >
                    <img
                      src={`https://flagcdn.com/w20/${country.flag.toLowerCase()}.png`}
                      alt={country.name}
                      className="h-4 w-6 object-cover rounded-sm flex-shrink-0"
                      loading="lazy"
                    />
                    <span className="font-medium text-zinc-900">{country.dialCode}</span>
                    <span className="text-zinc-600">{country.name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={displayValue}
        onChange={handlePhoneChange}
        placeholder={selectedCountry.placeholder}
        className="flex-1"
        disabled={disabled}
      />
    </div>
  );
}

