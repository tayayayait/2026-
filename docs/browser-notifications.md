# Browser Notifications

## Scope

Farm-Sync supports foreground browser notifications for persisted alert events. This is not web push: notifications are attempted only while the application is open and JavaScript is running.

Email, SMS, KakaoTalk, and service-worker push delivery are not connected.

## Consent

- Notification permission is requested only when the user turns on the `브라우저 알림` switch.
- Page load, dashboard analysis, and alert synchronization never open a permission prompt.
- Permission must be `granted` before the preference is enabled.
- Turning the switch off clears the stored consent time.
- The browser can require the user to restore a previously denied permission in site settings.

Browser notifications require HTTPS in production. Localhost is allowed by supported browsers for development.

## Delivery Policy

Only alert events that satisfy every condition are selected:

1. Browser delivery is enabled and has a consent timestamp.
2. The alert is unread.
3. The alert meets the selected minimum severity: all, warning or higher, or critical only.
4. The event has no prior successful or skipped browser delivery.
5. Failed delivery has fewer than three attempts and its retry time has passed.

At most five events are processed per trigger. Events are delivered oldest first to preserve order.

## Retry and Audit

- First failure: retry after 1 minute.
- Second failure: retry after 5 minutes.
- Third failure: no automatic retry.
- Retry evaluation occurs when a dashboard analysis completes or the Alert Center opens.
- `DELIVERED`, `FAILED`, and `SKIPPED` attempts record event ID, attempt number, time, next retry time, and a non-sensitive reason code.
- Audit output does not store API keys, farm addresses, browser tokens, email addresses, or phone numbers.

## Persistence

Phase 7 adds:

- `notification_preferences`
- `notification_delivery_logs`

Both tables use owner/administrator RLS and revoke unauthenticated table access. Browser fallback storage is scoped by the Supabase user ID.

Migration `20260620171836_create_notification_delivery.sql` was deployed to project `bpteuwiogabfvxqxzmux` on 2026-06-21. TypeScript database types were regenerated from the linked live schema after deployment.

## Production Requirements

1. Serve the application over HTTPS.
2. Validate consent, denial, successful delivery, and three failed attempts in supported desktop and mobile browsers.
3. Validate owner and administrator RLS behavior against the deployed project.
4. Define retention for delivery audit records before production traffic.
