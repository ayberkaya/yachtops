import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";

// Supported currencies
const SUPPORTED_CURRENCIES = ["USD", "EUR", "TRY"];

// Free tier exchange rate API (exchangerate-api.com)
// Using a free API that doesn't require authentication for basic rates
const EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/EUR";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch exchange rates from free API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(EXCHANGE_RATE_API_URL, {
        next: { revalidate: 3600 }, // Cache for 1 hour
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.status}`);
      }

      const data = await response.json();
      const rates = data.rates || {};

      // Filter to only supported currencies
      const filteredRates: Record<string, number> = {};
      SUPPORTED_CURRENCIES.forEach((currency) => {
        if (rates[currency] && typeof rates[currency] === "number") {
          filteredRates[currency] = rates[currency];
        }
      });

      // Ensure EUR is 1.0 (base currency)
      filteredRates.EUR = 1.0;

      return NextResponse.json({
        base: "EUR",
        rates: filteredRates,
        date: data.date || new Date().toISOString().split("T")[0],
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    
    // Fallback rates (approximate, should be updated manually if API fails)
    const fallbackRates: Record<string, number> = {
      EUR: 1.0,
      USD: 1.08, // Approximate
      TRY: 35.0, // Approximate
    };

    return NextResponse.json({
      base: "EUR",
      rates: fallbackRates,
      date: new Date().toISOString().split("T")[0],
      note: "Using fallback rates due to API error",
    });
  }
}

