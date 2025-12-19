# 🔧 Push Notification Troubleshooting Guide

## Problem: "Failed to enable push notifications" Alert

### Root Cause Analysis

The alert appears when push notification subscription fails. Common causes:

1. **VAPID Keys Not Configured** (Most Common)
   - VAPID keys are required for Web Push Notifications
   - Without them, subscription will always fail

2. **Service Worker Not Registered**
   - Push notifications require a service worker
   - Service worker is disabled in development mode

3. **Notification Permission Denied**
   - User denied notification permission
   - Browser doesn't support notifications

4. **Network/API Errors**
   - Backend API endpoints not accessible
   - Database connection issues

## Diagnostic Steps

### 1. Run Diagnostic Script

```bash
npx tsx scripts/diagnose-push-notifications.ts
```

This will check:
- ✅ VAPID keys configuration
- ✅ web-push package installation
- ✅ Environment variables
- ✅ Service worker setup

### 2. Check Browser Console

Open DevTools > Console and look for:
- `❌ Push Notification Error:` - Detailed error information
- `Push notifications are not configured` - VAPID keys missing
- `Failed to get VAPID public key` - API endpoint issue

### 3. Check Network Tab

Open DevTools > Network and check:
- `/api/push/vapid-public-key` - Should return 200 with `publicKey`
- `/api/push/subscription` - Should return 200 on POST

## Solutions

### Fix 1: Configure VAPID Keys

**Step 1:** Generate VAPID keys
```bash
node scripts/generate-vapid-keys.js
```

**Step 2:** Add to `.env.local`
```env
VAPID_PUBLIC_KEY=<public-key-from-step-1>
VAPID_PRIVATE_KEY=<private-key-from-step-1>
VAPID_EMAIL=mailto:admin@helmops.com
```

**Step 3:** Restart development server
```bash
npm run dev
```

### Fix 2: Check Service Worker

**Development Mode:**
- Service worker is disabled by default (prevents chunk loading issues)
- Push notifications won't work in dev mode
- This is expected behavior

**Production Mode:**
- Service worker is automatically registered
- Push notifications should work

### Fix 3: Check Browser Support

**Supported Browsers:**
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 16.4+, requires PWA installation)
- ❌ Safari (Desktop - not supported)

**Requirements:**
- HTTPS required (except localhost)
- Service worker must be registered
- Notification permission must be granted

### Fix 4: Check API Endpoints

Verify endpoints are accessible:
```bash
# Check VAPID key endpoint (requires authentication)
curl -H "Cookie: ..." https://helmops.com/api/push/vapid-public-key

# Should return: {"publicKey":"..."}
```

## Error Codes Reference

| Status | Meaning | Solution |
|--------|---------|----------|
| 401 | Unauthorized | User not logged in |
| 500 | VAPID keys not configured | Add VAPID keys to `.env.local` |
| 503 | Service unavailable | Check backend logs |
| Network Error | API unreachable | Check network connection |

## Prevention

The code now:
- ✅ Checks VAPID keys before attempting subscription
- ✅ Stores failure flag to prevent repeated attempts
- ✅ Uses silent mode to avoid alert spam
- ✅ Provides detailed error logging

## Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Run diagnostic script** to identify configuration issues
3. **Check browser console** for client-side errors
4. **Verify environment variables** are loaded correctly
5. **Test in production mode** (dev mode disables service worker)

## Related Files

- `components/pwa/push-notification-register.tsx` - Client-side subscription
- `app/api/push/vapid-public-key/route.ts` - VAPID key endpoint
- `app/api/push/subscription/route.ts` - Subscription management
- `lib/notifications.ts` - Push notification sending
- `public/sw.js` - Service worker (handles push events)

