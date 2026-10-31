# SmartHub Global

The Vite React application lives at the repository root. Install dependencies with `npm ci` and use `npm run dev` for local development.

Netlify uses `netlify.toml` to run `npm run build` and publish `dist`. Keep the site's Base directory empty so dependency installation runs alongside the root `package.json` and `package-lock.json`.

Configure the application's required `VITE_*` environment variables in Netlify before deploying. The original archive's `.env` file is intentionally excluded from the restored source. Existing Supabase services must remain available for the features that depend on them; restoring the frontend does not deploy those services.
