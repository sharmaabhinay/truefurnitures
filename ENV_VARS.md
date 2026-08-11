Environment variables and hosting notes

This project reads several environment variables. Keep secrets server-side and never commit them.

Server-only (must be kept secret):
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key used by server functions.
- `FIREBASE_PRIVATE_KEY` — Firebase service account private key (multi-line PEM). Also set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PROJECT_ID`.
- `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — Razorpay secret key and webhook signing secret.
- `RESEND_API_KEY` — API key for Resend (email service).
- `CLOUDINARY_API_SECRET` — Cloudinary API secret.

Public / client-safe (can be set as public env vars):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` (or their `VITE_` equivalents) — used by client SDKs and are considered publishable.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` — Cloudinary identifiers.

Common Vite pattern: client-visible variables must be prefixed with `VITE_` (e.g. `VITE_SUPABASE_URL`).

Hosting checklist
- Remove any tracked `.env` from the repo and add it to `.gitignore` (done).
- Rotate any secrets that were committed to source control.
- Set server-only variables in your hosting provider's secret manager (Vercel/Netlify/Render/Hostinger dashboard / Cloud provider) — do NOT expose `*_SECRET`, `*_KEY` or `FIREBASE_PRIVATE_KEY` publicly.
- Add `RAZORPAY_WEBHOOK_SECRET` to your hosting platform for webhook verification; configure the webhook URL on Razorpay.
- For Firebase Admin REST usage, ensure `FIREBASE_PRIVATE_KEY` is set as a multi-line value; some platforms require escaping newlines (replace `\n` with actual newlines in their dashboard, or store as a file in a secure store).

Non-destructive history guidance
- Avoid forced history rewrites on shared branches. If secrets were committed in past commits, the recommended steps are:
  - Rotate the exposed secrets immediately with the provider.
  - Use `git filter-repo` or BFG locally to purge secrets from history if you understand the implications and coordinate with collaborators.
  - If you prefer not to rewrite history, at minimum ensure secrets are invalidated and removed from the current tree.

Extra recommendations
- Enable GitHub's secret scanning and alerts.
- Add a pre-commit hook (e.g. `git-secrets`) to prevent future accidental commits of secrets.
- Use a secrets manager (Vault, Cloud provider secrets, or the hosting provider's environment variables) for production deployments.

