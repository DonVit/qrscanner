OAuth setup for qrscanner server

This server implements OAuth authentication using Passport and supports Google only.

Environment variables

- `SERVER_BASE_URL` - (optional) Public URL for this server, default `http://localhost:4000`. Used as the OAuth `redirect_uri` base.
- `FRONTEND_ORIGIN` - (optional) Frontend origin to redirect back to after successful login, default `http://localhost:5173`.

Google

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Set the authorized redirect URI to `${SERVER_BASE_URL}/auth/google/callback`.
3. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

Behavior

- Visit `/auth/google` on the server to start login.
- After successful login the server redirects to the frontend with `?authToken=...&username=...`.
- The frontend reads these query params and stores auth state in Redux.

Notes

- This uses Passport Google OAuth strategy.
- For production, implement secure `state` handling and keep provider secrets out of source control.
