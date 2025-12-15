# 📱 Push Notifications Setup

HelmOps supports Web Push Notifications for mobile devices. This allows users to receive notifications even when the app is closed.

## 🎯 Features

- ✅ **Mobile Push Notifications**: Receive notifications on iOS and Android
- ✅ **Desktop Notifications**: Works on desktop browsers too
- ✅ **Automatic Subscription**: Users are automatically subscribed when they grant permission
- ✅ **Background Notifications**: Notifications work even when app is closed
- ✅ **Click to Open**: Clicking notification opens the relevant page

## 🔧 Setup

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications:

```bash
node scripts/generate-vapid-keys.js
```

This will output:
```
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_EMAIL=mailto:admin@helmops.com
```

### 2. Add to Environment Variables

Add the VAPID keys to your `.env.local` file:

```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_EMAIL=mailto:admin@helmops.com
```

**⚠️ Important:**
- Keep `VAPID_PRIVATE_KEY` secret - never commit it to version control
- Use the same VAPID keys for all environments (dev, staging, production)
- The email should be a valid `mailto:` URL

### 3. Install Dependencies

The `web-push` package is already included. If you need to reinstall:

```bash
npm install web-push
```

### 4. Database Migration

The database schema already includes the `pushSubscription` field. If you need to update:

```bash
npx prisma db push
```

## 📱 How It Works

### User Flow

1. **First Visit**: User opens the app
2. **Permission Request**: Browser asks for notification permission
3. **Auto-Subscribe**: If permission granted, user is automatically subscribed
4. **Notifications**: User receives push notifications for:
   - Task assignments
   - Task completions
   - Task due soon/overdue
   - Message mentions
   - Message replies
   - Shopping list completions

### Technical Flow

1. **Service Worker**: Handles push events and displays notifications
2. **Push Subscription**: Stored in database (`User.pushSubscription`)
3. **Notification Creation**: When a notification is created via `createNotification()`, a push notification is automatically sent
4. **Click Handler**: Clicking notification opens the relevant page

## 🔍 Testing

### Desktop (Chrome/Edge)

1. Open the app in Chrome/Edge
2. Grant notification permission when prompted
3. Check browser console for subscription confirmation
4. Create a test notification (e.g., assign yourself a task)
5. You should receive a desktop notification

### Mobile (iOS Safari)

1. Open the app in Safari on iOS
2. Add to Home Screen (PWA install)
3. Open the installed app
4. Grant notification permission
5. Test notifications

### Mobile (Android Chrome)

1. Open the app in Chrome on Android
2. Install as PWA (prompt will appear)
3. Grant notification permission
4. Test notifications

## 🐛 Troubleshooting

### Notifications Not Working

1. **Check VAPID Keys**: Ensure VAPID keys are set in environment variables
2. **Check Permission**: Verify notification permission is granted
3. **Check Service Worker**: Open DevTools > Application > Service Workers
4. **Check Subscription**: Verify subscription exists in database
5. **Check Console**: Look for errors in browser console

### Common Issues

**"VAPID keys are not configured"**
- Add VAPID keys to `.env.local`
- Restart the development server

**"Notification permission denied"**
- User must grant permission manually
- Clear site data and try again

**"Push subscription failed"**
- Check internet connection
- Verify VAPID keys are correct
- Check browser console for errors

**"Notifications not appearing on mobile"**
- Ensure app is installed as PWA
- Check notification settings in device settings
- Verify service worker is registered

## 🔒 Security

- VAPID private key is never exposed to clients
- Only public key is sent to browser
- Subscriptions are user-specific and stored securely
- Invalid subscriptions are automatically removed

## 📚 API Reference

### Creating Notifications

Notifications are automatically sent when using `createNotification()`:

```typescript
import { createNotification } from "@/lib/notifications";

await createNotification(
  userId,
  NotificationType.TASK_ASSIGNED,
  "You have been assigned a new task",
  taskId
);
```

## 📝 Notes

- Push notifications require HTTPS (except localhost)
- iOS Safari requires PWA installation for push notifications
- Android Chrome supports push notifications without installation
- Desktop browsers support push notifications natively

