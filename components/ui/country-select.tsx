"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countries } from "@/lib/data/countries";

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country",
  className,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedCountry = React.useMemo(
    () => countries.find((c) => c.value === value || c.label === value),
    [value]
  );

  const filteredCountries = React.useMemo(() => {
    if (!search.trim()) {
      return countries;
    }
    const searchLower = search.toLowerCase().trim();
    return countries.filter(
      (country) =>
        country.label.toLowerCase().includes(searchLower) ||
        country.value.toLowerCase().includes(searchLower)
    );
  }, [search]);

  const handleSelect = (countryValue: string, countryLabel: string) => {
    // Store the country label (name) as the value to match existing form behavior
    onChange(countryLabel);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-11 border-border/50 bg-white text-slate-900 hover:bg-white hover:border-border focus-visible:ring-2 focus-visible:ring-ring/20",
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedCountry ? (
              <>
                <img
                  src={`https://flagcdn.com/w40/${selectedCountry.value.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/w80/${selectedCountry.value.toLowerCase()}.png 2x`}
                  width="20"
                  height="15"
                  alt={selectedCountry.label}
                  className="h-4 w-6 object-cover rounded-sm flex-shrink-0"
                  loading="lazy"
                />
                <span className="truncate">{selectedCountry.label}</span>
              </>
            ) : (
              <span className="text-slate-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 bg-white/95 backdrop-blur-xl backdrop-saturate-150 border-border/50 shadow-lg" 
        align="start" 
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border/50 p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    setOpen(false);
                  }
                }}
                className="pl-8 h-9 text-sm bg-white/60 backdrop-blur-sm text-slate-900 border-border/50"
                autoFocus
              />
            </div>
          </div>

          {/* Countries List */}
          <ScrollArea className="h-[300px]">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-600">
                No countries found
              </div>
            ) : (
              <div className="p-1">
                {filteredCountries.map((country) => {
                  const isSelected = selectedCountry?.value === country.value || selectedCountry?.label === country.label;
                  return (
                    <button
                      key={country.value}
                      type="button"
                      onClick={() => handleSelect(country.value, country.label)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                        "hover:bg-white/60 backdrop-blur-sm",
                        "focus:bg-white/60 backdrop-blur-sm focus:outline-none",
                        "text-slate-900",
                        isSelected && "bg-white/80 backdrop-blur-sm"
                      )}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${country.value.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w80/${country.value.toLowerCase()}.png 2x`}
                        width="20"
                        height="15"
                        alt={country.label}
                        className="h-4 w-6 object-cover rounded-sm flex-shrink-0"
                        loading="lazy"
                      />
                      <span className="flex-1 text-left font-medium">{country.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

