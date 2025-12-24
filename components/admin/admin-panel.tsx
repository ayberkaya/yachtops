/* Admin Panel - super admin only */
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, UserPlus, ChevronDown, Trash2, Check, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserForm = {
  name: string;
  email: string;
  vesselName: string;
  vesselType: string; // Motor Yacht, Sailing Yacht, Catamaran, Gulet, Other
  vesselFlag: string;
  vesselSize: string; // LOA in meters
  crewCount: string; // Total crew count
  planId: string | null;
};

type TenantUser = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  customRoleId: string | null;
  customRole: {
    id: string;
    name: string;
  } | null;
  active: boolean;
  createdAt: string;
};

type OwnerItem = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  yachtId: string | null;
  active: boolean;
  createdAt: string;
  users?: TenantUser[];
};

type AdminPanelProps = {
  view?: "create" | "owners";
  initialValues?: {
    name?: string;
    email?: string;
    vessel?: string;
    role?: string;
  };
};

// Country flags and names - sorted A to Z
const COUNTRIES = [
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BM", name: "Bermuda", flag: "🇧🇲" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CD", name: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "CG", name: "Republic of the Congo", flag: "🇨🇬" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FK", name: "Falkland Islands", flag: "🇫🇰" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "FO", name: "Faroe Islands", flag: "🇫🇴" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "GF", name: "French Guiana", flag: "🇬🇫" },
  { code: "GG", name: "Guernsey", flag: "🇬🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", flag: "🇬🇮" },
  { code: "GL", name: "Greenland", flag: "🇬🇱" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GP", name: "Guadeloupe", flag: "🇬🇵" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GS", name: "South Georgia", flag: "🇬🇸" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GU", name: "Guam", flag: "🇬🇺" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IM", name: "Isle of Man", flag: "🇮🇲" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "IO", name: "British Indian Ocean Territory", flag: "🇮🇴" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JE", name: "Jersey", flag: "🇯🇪" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "KP", name: "North Korea", flag: "🇰🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KY", name: "Cayman Islands", flag: "🇰🇾" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MF", name: "Saint Martin", flag: "🇲🇫" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "MO", name: "Macao", flag: "🇲🇴" },
  { code: "MP", name: "Northern Mariana Islands", flag: "🇲🇵" },
  { code: "MQ", name: "Martinique", flag: "🇲🇶" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MS", name: "Montserrat", flag: "🇲🇸" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NC", name: "New Caledonia", flag: "🇳🇨" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NF", name: "Norfolk Island", flag: "🇳🇫" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NU", name: "Niue", flag: "🇳🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PF", name: "French Polynesia", flag: "🇵🇫" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PM", name: "Saint Pierre and Miquelon", flag: "🇵🇲" },
  { code: "PN", name: "Pitcairn", flag: "🇵🇳" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "PS", name: "Palestine", flag: "🇵🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RE", name: "Réunion", flag: "🇷🇪" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SH", name: "Saint Helena", flag: "🇸🇭" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SJ", name: "Svalbard and Jan Mayen", flag: "🇸🇯" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ST", name: "São Tomé and Príncipe", flag: "🇸🇹" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "SX", name: "Sint Maarten", flag: "🇸🇽" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "TC", name: "Turks and Caicos Islands", flag: "🇹🇨" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "TF", name: "French Southern Territories", flag: "🇹🇫" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TK", name: "Tokelau", flag: "🇹🇰" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UM", name: "United States Minor Outlying Islands", flag: "🇺🇲" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VG", name: "British Virgin Islands", flag: "🇻🇬" },
  { code: "VI", name: "U.S. Virgin Islands", flag: "🇻🇮" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "WF", name: "Wallis and Futuna", flag: "🇼🇫" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "XK", name: "Kosovo", flag: "🇽🇰" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "YT", name: "Mayotte", flag: "🇾🇹" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
].sort((a, b) => a.name.localeCompare(b.name));

export default function AdminPanel({ 
  view = "create",
  initialValues 
}: AdminPanelProps) {
  // Initialize form with initialValues if available
  // This handles the case where initialValues are available on mount
  const [form, setForm] = useState<UserForm>(() => {
    // Values are already decoded in server component, no need to decode again
    return {
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      vesselName: initialValues?.vessel || "",
      vesselType: "Motor Yacht", // Default vessel type
      vesselFlag: "",
      vesselSize: "",
      crewCount: "1", // Default crew count
      planId: null,
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number; currency: string; min_loa: number; max_loa: number | null }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountrySelectOpen, setIsCountrySelectOpen] = useState(false);
  const countrySearchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search - memoized for performance
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) {
      return COUNTRIES;
    }
    const searchLower = countrySearch.toLowerCase().trim();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(searchLower) ||
        country.code.toLowerCase().includes(searchLower)
    );
  }, [countrySearch]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isCountrySelectOpen && countrySearchInputRef.current) {
      // Small delay to ensure the dropdown is fully rendered
      const timer = setTimeout(() => {
        countrySearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCountrySelectOpen]);

  // Handle keyboard input when dropdown is open
  useEffect(() => {
    if (!isCountrySelectOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in the search input
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      // Ignore special keys (Escape, Enter, Arrow keys, etc.)
      if (
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      // If it's a printable character, focus input and append it
      if (e.key.length === 1) {
        e.preventDefault();
        if (countrySearchInputRef.current) {
          countrySearchInputRef.current.focus();
          setCountrySearch((prev) => prev + e.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCountrySelectOpen]);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch("/api/admin/plans", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };
    if (view === "create") {
      fetchPlans();
    }
  }, [view]);

  // Auto-select plan based on vessel size
  useEffect(() => {
    if (form.vesselSize && plans.length > 0) {
      const vesselSizeNum = parseFloat(form.vesselSize);
      if (!isNaN(vesselSizeNum)) {
        // Find the matching plan based on LOA range
        const matchingPlan = plans.find((plan) => {
          const min = plan.min_loa;
          const max = plan.max_loa;
          if (max === null) {
            // Enterprise plan (60m+)
            return vesselSizeNum >= min;
          }
          return vesselSizeNum >= min && vesselSizeNum <= max;
        });
        
        if (matchingPlan && form.planId !== matchingPlan.id) {
          setForm((prev) => ({ ...prev, planId: matchingPlan.id }));
        }
      }
    }
  }, [form.vesselSize, plans]);

  // Force form to populate from URL params using useEffect
  // This is critical for auto-filling from URL parameters
  // Handles both initial mount and when initialValues change after mount (e.g., dynamic import with ssr: false)
  // Use stable dependency array with individual properties to avoid React warnings about changing array size
  const initialName = initialValues?.name;
  const initialEmail = initialValues?.email;
  const initialVessel = initialValues?.vessel;
  
  useEffect(() => {
    // Check if we have any initial values to apply
    const hasInitialValues = initialName || initialEmail || initialVessel;

    if (hasInitialValues) {
      // Force update form state with initial values
      // This ensures URL params populate the form even if they arrive after mount
      setForm((prev) => {
        const updates: Partial<UserForm> = {};
        let hasChanges = false;
        
        // Only update if value exists and is different from current
        if (initialName && initialName.trim() && initialName !== prev.name) {
          updates.name = initialName.trim();
          hasChanges = true;
        }
        if (initialEmail && initialEmail.trim() && initialEmail !== prev.email) {
          updates.email = initialEmail.trim();
          hasChanges = true;
        }
        if (initialVessel && initialVessel.trim() && initialVessel !== prev.vesselName) {
          updates.vesselName = initialVessel.trim();
          hasChanges = true;
        }
        
        // Only update if there are actual changes to avoid unnecessary re-renders
        if (hasChanges) {
          return {
            ...prev,
            ...updates,
            // Preserve these fields - don't overwrite with empty values
            vesselType: prev.vesselType,
            vesselFlag: prev.vesselFlag,
            vesselSize: prev.vesselSize,
            crewCount: prev.crewCount,
            planId: prev.planId,
          };
        }
        
        return prev;
      });
    }
  }, [initialName, initialEmail, initialVessel]);

  const handleCreate = async () => {
    setMessage(null);
    
    // Validation
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.vesselName.trim() ||
      !form.vesselType ||
      !form.vesselFlag.trim() ||
      !form.vesselSize.trim() ||
      !form.crewCount.trim() ||
      !form.planId
    ) {
      setMessage("Please fill in all fields including vessel size, crew count, and select a plan.");
      return;
    }

    // Validate crew count
    const crewCountNum = parseInt(form.crewCount, 10);
    if (isNaN(crewCountNum) || crewCountNum < 1) {
      setMessage("Crew count must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      // Use server action instead of API route
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("vesselName", form.vesselName.trim());
      formData.append("vesselType", form.vesselType);
      formData.append("vesselFlag", form.vesselFlag.trim());
      formData.append("vesselSize", form.vesselSize.trim());
      formData.append("crewCount", form.crewCount.trim());
      formData.append("planId", form.planId);

      const { createUserAndInvite } = await import("@/actions/create-user");
      const result = await createUserAndInvite(formData);

      if (result.success) {
        setMessage(result.message || "Customer created successfully. Welcome email sent!");
        setForm({
          name: "",
          email: "",
          vesselName: "",
          vesselType: "Motor Yacht",
          vesselFlag: "",
          vesselSize: "",
          crewCount: "1",
          planId: null,
        });
        await loadOwners();
      } else {
        setMessage(result.message || "User creation failed");
      }
    } catch (e) {
      console.error("Error creating user:", e);
      setMessage("An error occurred, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      const res = await fetch("/api/admin/owners?includeUsers=true", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load owners (${res.status})`);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      const safeOwners = Array.isArray(data) ? data : [];

      setOwners(safeOwners);
      if (!selectedOwnerId && safeOwners.length) {
        setSelectedOwnerId(safeOwners[0].id);
      }
    } catch (e) {
      console.error("loadOwners error", e);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  };

  const toggleOwnerActive = async (ownerId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) => list.map((o) => (o.id === ownerId ? { ...o, active } : o)));
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("owner toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) =>
      list.map((o) => ({
        ...o,
        users: o.users?.map((u) => (u.id === userId ? { ...u, active } : u)),
      }))
    );
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("user toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  const handleDeleteClick = (owner: OwnerItem) => {
    setOwnerToDelete(owner);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ownerToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/owners/${ownerToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete owner");
      }

      // Remove owner from list
      setOwners((list) => list.filter((o) => o.id !== ownerToDelete.id));
      
      // If deleted owner was selected, clear selection
      if (selectedOwnerId === ownerToDelete.id) {
        setSelectedOwnerId(null);
      }

      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
    } catch (e: any) {
      console.error("Delete error:", e);
      alert(e.message || "Failed to delete owner. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (view === "owners") {
      loadOwners();
    }
  }, [view]);

  const selectedOwner = view === "owners" ? owners.find((o) => o.id === selectedOwnerId) || null : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {view === "create" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        <span>{view === "create" ? "Create User" : "Owners"}</span>
      </div>

      <div className="space-y-6">
        {view === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Customer</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Creates a new vessel and owner account. Default expense categories will be set up automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1: Full Name | Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Row 2: Vessel Name | Vessel Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Vessel Name</Label>
                  <Input
                    value={form.vesselName}
                    onChange={(e) => setForm((f) => ({ ...f, vesselName: e.target.value }))}
                    placeholder="Enter vessel name"
                  />
                </div>
                <div>
                  <Label>Vessel Type</Label>
                  <Select
                    value={form.vesselType}
                    onValueChange={(value) => setForm((f) => ({ ...f, vesselType: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vessel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Motor Yacht">Motor Yacht</SelectItem>
                      <SelectItem value="Sailing Yacht">Sailing Yacht</SelectItem>
                      <SelectItem value="Catamaran">Catamaran</SelectItem>
                      <SelectItem value="Gulet">Gulet</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Vessel Size (LOA) | Total Crew Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Vessel Size (LOA in meters)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.vesselSize}
                    onChange={(e) => setForm((f) => ({ ...f, vesselSize: e.target.value }))}
                    placeholder="e.g. 45"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the Length Overall (LOA) in meters. Plan will be auto-selected based on size.
                  </p>
                </div>
                <div>
                  <Label>Total Crew Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.crewCount}
                    onChange={(e) => setForm((f) => ({ ...f, crewCount: e.target.value }))}
                    placeholder="e.g. 8"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total number of crew members on board.
                  </p>
                </div>
              </div>

              {/* Row 4: Vessel Flag */}
              <div>
                <Label>Vessel Flag</Label>
                <Select
                  value={form.vesselFlag}
                  open={isCountrySelectOpen}
                  onOpenChange={(open) => {
                    setIsCountrySelectOpen(open);
                    if (!open) {
                      setCountrySearch(""); // Reset search when dropdown closes
                    }
                  }}
                  onValueChange={(value) => {
                    setForm((f) => ({ ...f, vesselFlag: value }));
                    setCountrySearch(""); // Reset search when selection is made
                    setIsCountrySelectOpen(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {form.vesselFlag && (() => {
                        const selectedCountry = COUNTRIES.find(c => c.name === form.vesselFlag);
                        return selectedCountry ? (
                          <span className="text-xl flex-shrink-0">{selectedCountry.flag}</span>
                        ) : null;
                      })()}
                      <SelectValue placeholder="Select country flag" className="flex-1" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px] p-0">
                    {/* Search Input - Sticky at top */}
                    <div className="sticky top-0 z-10 bg-white border-b border-border/50 p-2 backdrop-blur-sm">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={countrySearchInputRef}
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCountrySearch(e.target.value);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              setCountrySearch("");
                              setIsCountrySelectOpen(false);
                            }
                            // Prevent Enter from closing the dropdown if there's text
                            if (e.key === "Enter" && countrySearch.trim()) {
                              e.preventDefault();
                            }
                          }}
                          className="pl-8 h-9 text-sm"
                          autoFocus={false}
                        />
                      </div>
                    </div>
                    {/* Filtered Countries List */}
                    {filteredCountries.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No countries found
                      </div>
                    ) : (
                      filteredCountries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Plan Selection */}
              <div className="mt-6 pt-6 border-t border-border">
                <Label className="text-base font-semibold mb-4 block">Subscription Plan</Label>
                {loadingPlans ? (
                  <p className="text-sm text-muted-foreground">Loading plans...</p>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans available. Please contact support.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {plans.map((plan) => {
                      const isSelected = form.planId === plan.id;
                      const formatPrice = (price: number, currency: string) => {
                        if (price === 0) return "Custom";
                        return new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: currency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(price);
                      };
                      const formatLOA = (min: number, max: number | null) => {
                        if (max === null) return `${min}m+`;
                        if (min === 0 && max) return `Up to ${max}m`;
                        return `${min}-${max}m`;
                      };

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, planId: plan.id }))}
                          className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base">{plan.name}</span>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">{formatPrice(plan.price, plan.currency)}</span>
                              {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatLOA(plan.min_loa, plan.max_loa)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.planId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: {plans.find((p) => p.id === form.planId)?.name || "Unknown"}
                  </p>
                )}
              </div>

              <Button onClick={handleCreate} disabled={submitting} className="mt-6">
                {submitting ? "Creating..." : "Create Customer"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        )}

        {view === "owners" && (
          <>
            {loadingOwners && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Loading owners...
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Owners</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No owners found.
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length > 0 && (
              <div className="space-y-3">
                {owners.map((owner) => (
                  <Collapsible
                    key={owner.id}
                    open={selectedOwnerId === owner.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedOwnerId(owner.id);
                      } else if (selectedOwnerId === owner.id) {
                        setSelectedOwnerId(null);
                      }
                    }}
                  >
                    <Card className="gap-1.5 p-3">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between py-1.5 px-0 min-h-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="m-0 text-base">{owner.name || "Unnamed"}</CardTitle>
                            {!owner.active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-2 pt-0 px-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">{owner.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Tenant: {owner.yachtId || "-"}
                              </div>
                              {owner.users && owner.users.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {owner.users.length} user{owner.users.length !== 1 ? "s" : ""} in this vessel
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={owner.active ? "secondary" : "default"}
                                onClick={() => toggleOwnerActive(owner.id, !owner.active)}
                              >
                                {owner.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(owner)}
                                title="Delete owner"
                                aria-label="Delete owner"
                                className="gap-2"
                              >
                                <Trash2 className="h-5 w-5 shrink-0 stroke-current" />
                                <span className="font-medium">Delete</span>
                              </Button>
                            </div>
                          </div>

                          {owner.users && owner.users.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold">Users</div>
                              <div className="space-y-2">
                                {owner.users.map((u) => (
                                  <div
                                    key={u.id}
                                    className="flex items-center justify-between rounded border p-2"
                                  >
                                    <div>
                                      <div className="font-medium text-sm">
                                        {u.name || u.username || u.email}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {u.email} • {u.customRole?.name || u.role}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={u.active ? "secondary" : "default"}
                                      onClick={() => toggleUserActive(u.id, !u.active)}
                                    >
                                      {u.active ? "Deactivate" : "Activate"}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Are you sure you want to delete <strong>{ownerToDelete?.name || ownerToDelete?.email}</strong>?
            </p>
            <div>
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The owner account</li>
                <li>The associated vessel (yacht)</li>
                <li>All users in this vessel</li>
                <li>All data associated with this vessel (trips, tasks, expenses, etc.)</li>
              </ul>
            </div>
            <p className="text-destructive font-medium">This action cannot be undone.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Owner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

