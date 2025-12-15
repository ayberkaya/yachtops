#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push Notifications
 * 
 * Run this script to generate VAPID public and private keys:
 * node scripts/generate-vapid-keys.js
 * 
 * Add the output to your .env.local file:
 * VAPID_PUBLIC_KEY=<public-key>
 * VAPID_PRIVATE_KEY=<private-key>
 * VAPID_EMAIL=mailto:your-email@example.com
 */

const webpush = require("web-push");

console.log("🔑 Generating VAPID keys for Web Push Notifications...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("✅ VAPID keys generated successfully!\n");
console.log("Add these to your .env.local file:\n");
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@helmops.com\n`);
console.log("⚠️  Keep your VAPID_PRIVATE_KEY secret and never commit it to version control!");

