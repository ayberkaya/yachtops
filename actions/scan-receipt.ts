"use server";

import { getSession } from "@/lib/get-session";
import { getTenantId } from "@/lib/tenant";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

const receiptExtractionSchema = z.object({
  merchantName: z.string().describe("The name of the merchant/vendor/store"),
  date: z.string().describe("Date in ISO format YYYY-MM-DD"),
  amount: z.number().describe("Total amount as a number"),
  currency: z.string().describe("Currency code (EUR, USD, GBP, etc.). Default to EUR if unclear."),
  category: z
    .enum([
      "Provisions",
      "Fuel",
      "Dockage",
      "Maintenance",
      "Crew",
      "Other",
      "Marina & Port Fees",
      "Cleaning & Laundry",
      "Maintenance & Repairs",
      "Tender & Toys",
      "Miscellaneous",
      "Insurance",
      "Communications & IT",
      "Safety Equipment",
      "Crew Training",
      "Guest Services",
      "Waste Disposal",
      "Dockage & Utilities",
      "Transport & Logistics",
      "Permits & Customs",
      "Fuel Additives",
    ])
    .describe("Expense category based on the merchant type and context. If items are not visible, infer from merchant name and location."),
  description: z.string().describe("A brief, general description. Format: '[Category] from [Merchant Name]' or similar. Do NOT list individual items. Examples: 'Groceries from ŞOK Market', 'Fuel from Marina', 'Provisions from Supermarket'."),
  items: z
    .array(
      z.object({
        description: z.string(),
        price: z.number(),
      })
    )
    .describe("List of individual items ONLY if clearly visible and readable. For long receipts where only header and footer are photographed (most common case), return empty array []. If no items are visible, return empty array []."),
});

export type ReceiptScanResult = z.infer<typeof receiptExtractionSchema>;

export interface ScanReceiptResult {
  success: boolean;
  error?: string;
  data?: ReceiptScanResult & {
    categoryId?: string;
    hasMismatch?: boolean;
    itemsTotal?: number;
    receiptTotal?: number;
    imageFileName?: string;
    imageFileSize?: number;
    imageFileType?: string;
  };
}

export async function scanReceiptAction(
  formData: FormData
): Promise<ScanReceiptResult> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return { success: false, error: "User must be assigned to a yacht" };
    }

    const file = formData.get("image") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No image file provided" };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    // Validate file size (max 10MB for mobile photos)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { 
        success: false, 
        error: `Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB. Please compress the image or use a smaller resolution.` 
      };
    }

    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Use OpenAI Vision API via Vercel AI SDK
    // Ensure OPENAI_API_KEY is set in environment variables
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: "OpenAI API key not configured" };
    }
    const model = openai("gpt-4o");

    const { object } = await generateObject({
      model,
      schema: receiptExtractionSchema,
      messages: [
        {
          role: "system",
          content: `You are an expert expense accountant for yacht operations. Analyze this receipt image and extract the following information in strict JSON format.

IMPORTANT CONTEXT: Yacht receipts are often very long (2-2.5 meters) and are typically photographed showing only the TOP (header with date, time, vendor name) and BOTTOM (total amount) sections. The middle section with individual items is usually NOT visible. Focus on extracting only what is clearly visible.

1. Merchant/Vendor Name: The name of the store, restaurant, or business (usually at the top of receipt)
2. Date: The transaction date in ISO format (YYYY-MM-DD). Usually found at the top of the receipt.
3. Total Amount: The final total amount paid (as a number, not a string). This is the TOPLAM or TOTAL amount shown at the bottom of the receipt.
4. Currency: Detect the currency symbol (€, $, £, ₺, etc.) and return the currency code (EUR, USD, GBP, TRY, etc.). Default to EUR if unclear.
5. Category: Predict the expense category based on the merchant name and context. Choose from: Provisions, Fuel, Dockage, Maintenance, Crew, Marina & Port Fees, Cleaning & Laundry, Maintenance & Repairs, Tender & Toys, Miscellaneous, Insurance, Communications & IT, Safety Equipment, Crew Training, Guest Services, Waste Disposal, Dockage & Utilities, Transport & Logistics, Permits & Customs, Fuel Additives, or Other.
6. Description: Provide a brief, general description. Format: '[Category] from [Merchant Name]'. Examples: "Groceries from ŞOK Market", "Fuel from Marina", "Provisions from Supermarket". DO NOT list individual items - users don't need item details, only the basic expense information.
7. Items: Extract individual line items ONLY if they are clearly visible and readable in the image. For long receipts where only header and footer are photographed (common case), return empty array []. If items ARE visible:
   - Include negative amounts (discounts/refunds) as negative prices
   - The sum of all item prices (including negative ones) should equal the Total Amount
   - Return empty array [] if items are not clearly visible

CRITICAL: Most yacht receipts show only header and footer. Do NOT try to extract items that are not visible. Focus on: merchant name, date, and total amount.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image",
              image: dataUrl,
            },
            {
              type: "text",
              text: "Extract all receipt information accurately.",
            },
          ],
        },
      ],
    });

    // Ensure currency has a default value if not provided or empty
    const currency = object.currency?.trim() || "EUR";
    
    // Ensure items is always an array (should be from schema, but safety check)
    const items = Array.isArray(object.items) ? object.items : [];
    
    // Use the AI-generated description directly (it should be general like "Groceries from ŞOK Market")
    // Don't build description from items since items are usually not visible in yacht receipts
    let description = object.description || "";
    
    // If description is empty or too generic, create a simple one from merchant and category
    if (!description || description.length < 5) {
      const categoryName = object.category || "Expense";
      const merchantName = object.merchantName || "Merchant";
      description = `${categoryName} from ${merchantName}`;
    }
    
    // Only validate totals if items are actually present (rare case for yacht receipts)
    let hasMismatch = false;
    let itemsTotal = 0;
    let receiptTotal = typeof object.amount === 'number' ? object.amount : 0;
    
    if (items.length > 0) {
      // Calculate sum of item prices
      itemsTotal = items.reduce((sum, item) => {
        const price = typeof item.price === 'number' ? item.price : 0;
        return sum + price;
      }, 0);
      
      // Check if items total matches receipt total (allow small rounding differences)
      const difference = Math.abs(itemsTotal - receiptTotal);
      hasMismatch = difference > 0.01; // Allow 1 cent difference for rounding
    }

    // Map category name to category ID
    const categories = await db.expenseCategory.findMany({
      where: { yachtId: tenantId },
    });

    // Find matching category (case-insensitive, partial match)
    const categoryId =
      categories.find(
        (cat) =>
          cat.name.toLowerCase() === object.category.toLowerCase() ||
          cat.name.toLowerCase().includes(object.category.toLowerCase()) ||
          object.category.toLowerCase().includes(cat.name.toLowerCase())
      )?.id || null;

    // If no exact match, try to find a similar category
    if (!categoryId && categories.length > 0) {
      // Fallback: use "Miscellaneous" or "Other" if available
      const fallbackCategory = categories.find(
        (cat) =>
          cat.name.toLowerCase().includes("miscellaneous") ||
          cat.name.toLowerCase().includes("other")
      );
      if (fallbackCategory) {
        return {
          success: true,
          data: {
            ...object,
            currency,
            items,
            description,
            categoryId: fallbackCategory.id,
            imageFileName: file.name,
            imageFileSize: file.size,
            imageFileType: file.type,
            hasMismatch,
            itemsTotal,
            receiptTotal,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        ...object,
        currency,
        items,
        description,
        categoryId: categoryId || undefined,
        imageFileName: file.name,
        imageFileSize: file.size,
        imageFileType: file.type,
        hasMismatch,
        itemsTotal,
        receiptTotal,
      },
    };
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to scan receipt. Please try again.",
    };
  }
}

