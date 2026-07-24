OAuth setup for qrscanner server

This server implements simple OAuth start and callback endpoints for Google and Facebook.

Environment variables

- `SERVER_BASE_URL` - (optional) Public URL for this server, default `http://localhost:4000`. Used as the OAuth `redirect_uri` base.
- `FRONTEND_ORIGIN` - (optional) Frontend origin to redirect back to after successful login, default `http://localhost:5173`.

Google

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Set the authorized redirect URI to `${SERVER_BASE_URL}/auth/google/callback` (e.g. `http://localhost:4000/auth/google/callback`).
3. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

Facebook

1. Create an app in Facebook Developers and add Facebook Login.
2. Set the Valid OAuth Redirect URI to `${SERVER_BASE_URL}/auth/facebook/callback`.
3. Set environment variables:
   - `FACEBOOK_CLIENT_ID`
   - `FACEBOOK_CLIENT_SECRET`

Behavior

- Visit `/auth/google` or `/auth/facebook` on the server to start login.
- After successful login the server will redirect to the frontend with `?authToken=...&username=...`.
- The frontend reads these query params and stores the auth state in the Redux store.

Notes

- This implementation does not validate or persist OAuth state parameters. For production, implement CSRF protection via `state` and verify it.
- Provider client IDs/secrets must be kept secret. Do not commit them to source control.
- The server expects to be able to reach provider token endpoints from the environment where it runs.
