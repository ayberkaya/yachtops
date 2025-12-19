#!/usr/bin/env node

/**
 * Diagnostic script to check push notification configuration
 * 
 * Run: npx tsx scripts/diagnose-push-notifications.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

console.log("🔍 Push Notification Diagnostic Tool\n");
console.log("=" .repeat(50));

// 1. Check VAPID keys
console.log("\n1️⃣ Checking VAPID Keys:");
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (!vapidPublicKey) {
  console.log("❌ VAPID_PUBLIC_KEY is NOT set");
  console.log("   → This is the PRIMARY reason for push notification failures");
} else {
  console.log("✅ VAPID_PUBLIC_KEY is set");
  console.log(`   → Key: ${vapidPublicKey.substring(0, 20)}...`);
}

if (!vapidPrivateKey) {
  console.log("❌ VAPID_PRIVATE_KEY is NOT set");
  console.log("   → Required for sending push notifications");
} else {
  console.log("✅ VAPID_PRIVATE_KEY is set");
  console.log(`   → Key: ${vapidPrivateKey.substring(0, 20)}...`);
}

if (!vapidEmail) {
  console.log("⚠️  VAPID_EMAIL is NOT set (optional but recommended)");
  console.log("   → Default will be used: mailto:admin@helmops.com");
} else {
  console.log(`✅ VAPID_EMAIL is set: ${vapidEmail}`);
}

// 2. Check web-push package
console.log("\n2️⃣ Checking web-push package:");
try {
  const webpush = require("web-push");
  console.log("✅ web-push package is installed");
  console.log(`   → Version: ${webpush.version || "unknown"}`);
} catch (error) {
  console.log("❌ web-push package is NOT installed");
  console.log("   → Run: npm install web-push");
}

// 3. Check environment
console.log("\n3️⃣ Environment Check:");
console.log(`   → NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`   → Environment file: ${process.env.NODE_ENV === "production" ? ".env.production" : ".env.local"}`);

// 4. Check service worker
console.log("\n4️⃣ Service Worker Check:");
console.log("   → Service worker file: public/sw.js");
console.log("   → Registration: components/pwa/service-worker-register.tsx");
console.log("   → Note: Service worker must be registered in production mode");

// 5. Check API routes
console.log("\n5️⃣ API Routes Check:");
console.log("   → GET /api/push/vapid-public-key");
console.log("   → GET /api/push/subscription");
console.log("   → POST /api/push/subscription");
console.log("   → DELETE /api/push/subscription");

// 6. Recommendations
console.log("\n6️⃣ Recommendations:");

if (!vapidPublicKey || !vapidPrivateKey) {
  console.log("\n📝 To fix push notifications:");
  console.log("   1. Generate VAPID keys:");
  console.log("      node scripts/generate-vapid-keys.js");
  console.log("\n   2. Add to .env.local:");
  console.log("      VAPID_PUBLIC_KEY=<public-key>");
  console.log("      VAPID_PRIVATE_KEY=<private-key>");
  console.log("      VAPID_EMAIL=mailto:admin@helmops.com");
  console.log("\n   3. Restart your development server");
} else {
  console.log("✅ VAPID keys are configured");
  console.log("   → If push notifications still fail, check:");
  console.log("     - Service worker is registered");
  console.log("     - Browser supports push notifications");
  console.log("     - User has granted notification permission");
  console.log("     - HTTPS is enabled (required for push notifications)");
}

console.log("\n" + "=".repeat(50));
console.log("\n💡 Tip: Check browser console for detailed error messages");
console.log("   → Open DevTools > Console");
console.log("   → Look for 'push notification' related errors\n");

