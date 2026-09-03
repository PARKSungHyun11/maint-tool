# Maint Tool account and sync setup

The app is fully usable offline without these credentials. Add the services below before a public beta that tests accounts or cloud restore.

## Current configured backend

- Supabase organization and project: `Maint Tool`
- Project reference: `gnqwidcabovqjulscpco`
- Region: South Asia (Mumbai)
- Google sign-in: configured and verified end to end
- Allowed app callback: `com.parksunghyun.mainttool://login-callback`
- Local browser callback: `http://localhost:4173`
- Database: `flight_log_drafts` with Row Level Security enabled

The project URL and publishable client key are stored in `config.js`. The Google OAuth client secret is stored only in the provider dashboards and must never be copied into this repository.

## 1. Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. In Google Cloud, create an OAuth web client and add Supabase's callback URL (`https://YOUR-PROJECT.supabase.co/auth/v1/callback`) as an authorized redirect URI.
4. In Supabase Authentication, enable Google and enter that Google client ID and secret. Enable the other providers only after their provider credentials are ready.
5. In Supabase Authentication → URL Configuration, add `com.parksunghyun.mainttool://login-callback` to the allowed redirect URLs.
6. Copy `config.example.js` to `config.js` and enter only the public project URL and public anon/publishable key.
7. Rebuild and sync the native projects. The app now opens OAuth in the system browser, receives the callback through the registered app link, stores the Supabase session, and returns to the signed-in account screen.

Apple, Naver, and Kakao remain disabled until their respective developer-console app registrations and credentials are supplied. Do not enable a provider with placeholder credentials.

Company accounts must be verified by email. Domain selection in the app is only the first UI check; a trusted Edge Function must grant the company entitlement only after the selected-domain address is verified. Do not put a Supabase service-role key in `config.js` or the app bundle.

## 2. Security and operational requirements

- Keep Row Level Security enabled.
- Store drafts locally first and sync afterward.
- Add account deletion and privacy-policy links before App Store submission.
- Keep a conflict copy when two devices update the same draft.
- Never transmit or log passwords, manual content, or flight-log text to analytics SDKs.
- Generated Full Log text is a deterministic drafting aid and must remain editable and reviewable by the user.
