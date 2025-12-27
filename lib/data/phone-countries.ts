// Country phone codes with validation patterns
export interface PhoneCountry {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  pattern: RegExp;
  placeholder: string;
  maxLength: number;
}

export const phoneCountries: PhoneCountry[] = [
  {
    code: "TR",
    dialCode: "+90",
    name: "Turkey",
    flag: "tr",
    pattern: /^(\+90|0)?[5][0-9]{9}$/,
    placeholder: "5XX XXX XX XX",
    maxLength: 10,
  },
  {
    code: "US",
    dialCode: "+1",
    name: "United States",
    flag: "us",
    pattern: /^(\+1)?[2-9][0-9]{2}[2-9][0-9]{2}[0-9]{4}$/,
    placeholder: "(XXX) XXX-XXXX",
    maxLength: 10,
  },
  {
    code: "GB",
    dialCode: "+44",
    name: "United Kingdom",
    flag: "gb",
    pattern: /^(\+44|0)?[1-9][0-9]{8,9}$/,
    placeholder: "7XXX XXXXXX",
    maxLength: 10,
  },
  {
    code: "DE",
    dialCode: "+49",
    name: "Germany",
    flag: "de",
    pattern: /^(\+49|0)?[1-9][0-9]{8,10}$/,
    placeholder: "1XX XXXXXXX",
    maxLength: 11,
  },
  {
    code: "FR",
    dialCode: "+33",
    name: "France",
    flag: "fr",
    pattern: /^(\+33|0)?[1-9][0-9]{8}$/,
    placeholder: "X XX XX XX XX",
    maxLength: 9,
  },
  {
    code: "IT",
    dialCode: "+39",
    name: "Italy",
    flag: "it",
    pattern: /^(\+39|0)?[0-9]{6,10}$/,
    placeholder: "3XX XXX XXXX",
    maxLength: 10,
  },
  {
    code: "ES",
    dialCode: "+34",
    name: "Spain",
    flag: "es",
    pattern: /^(\+34|0)?[6-9][0-9]{8}$/,
    placeholder: "6XX XXX XXX",
    maxLength: 9,
  },
  {
    code: "GR",
    dialCode: "+30",
    name: "Greece",
    flag: "gr",
    pattern: /^(\+30|0)?[2-9][0-9]{8,9}$/,
    placeholder: "2XX XXX XXXX",
    maxLength: 10,
  },
  {
    code: "CY",
    dialCode: "+357",
    name: "Cyprus",
    flag: "cy",
    pattern: /^(\+357|0)?[2-9][0-9]{7}$/,
    placeholder: "9X XXX XXX",
    maxLength: 8,
  },
  {
    code: "MT",
    dialCode: "+356",
    name: "Malta",
    flag: "mt",
    pattern: /^(\+356|0)?[2-9][0-9]{7}$/,
    placeholder: "2XXX XXXX",
    maxLength: 8,
  },
  {
    code: "RU",
    dialCode: "+7",
    name: "Russia",
    flag: "ru",
    pattern: /^(\+7|8)?[3-9][0-9]{9}$/,
    placeholder: "9XX XXX-XX-XX",
    maxLength: 10,
  },
  {
    code: "AE",
    dialCode: "+971",
    name: "United Arab Emirates",
    flag: "ae",
    pattern: /^(\+971|0)?[2-9][0-9]{8}$/,
    placeholder: "5X XXX XXXX",
    maxLength: 9,
  },
  {
    code: "SA",
    dialCode: "+966",
    name: "Saudi Arabia",
    flag: "sa",
    pattern: /^(\+966|0)?[5][0-9]{8}$/,
    placeholder: "5X XXX XXXX",
    maxLength: 9,
  },
  {
    code: "AU",
    dialCode: "+61",
    name: "Australia",
    flag: "au",
    pattern: /^(\+61|0)?[2-9][0-9]{8}$/,
    placeholder: "4XX XXX XXX",
    maxLength: 9,
  },
  {
    code: "NZ",
    dialCode: "+64",
    name: "New Zealand",
    flag: "nz",
    pattern: /^(\+64|0)?[2-9][0-9]{7,8}$/,
    placeholder: "2X XXX XXXX",
    maxLength: 8,
  },
];

// Default country (Turkey)
export const defaultPhoneCountry = phoneCountries.find((c) => c.code === "TR") || phoneCountries[0];

// Format phone number based on country
export function formatPhoneNumber(phone: string, country: PhoneCountry): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");
  
  // Remove country code if present
  let number = cleaned.replace(new RegExp(`^\\+?${country.dialCode.replace("+", "")}`), "");
  
  // Remove leading 0 if present
  if (number.startsWith("0")) {
    number = number.substring(1);
  }
  
  // Limit to max length
  number = number.substring(0, country.maxLength);
  
  return number;
}

// Validate phone number
export function validatePhoneNumber(phone: string, country: PhoneCountry): boolean {
  if (!phone) return true; // Optional field
  const cleaned = phone.replace(/[^\d+]/g, "");
  return country.pattern.test(cleaned);
}

