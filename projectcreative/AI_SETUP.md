# Lingua Quest learning API

The Python API stores vocabulary and study-day records under `users/{Firebase UID}` in Firestore. It verifies every Firebase ID token; the browser never receives an Admin SDK credential or Gemini API key.

## Deploy to Cloud Run

1. Enable Cloud Run, Cloud Build, Artifact Registry, Firestore, and Secret Manager APIs in project `english-f3d71`.
2. Give the Cloud Run runtime service account the `roles/datastore.user` role. The API uses Application Default Credentials to access Firestore.
3. From the project root, deploy the API:

   ```powershell
   gcloud run deploy linguaquest-api --source . --region asia-southeast1 --project english-f3d71 --allow-unauthenticated --set-env-vars GOOGLE_CLOUD_PROJECT=english-f3d71,WEB_ORIGINS=https://brogays.github.io
   ```

   The service is publicly invokable so Firebase Hosting can proxy requests; every `/api/v1` data route still requires a valid Firebase ID token.
4. To enable Gemini, create a Secret Manager secret named `linguaquest-gemini-key`, grant the Cloud Run runtime service account `roles/secretmanager.secretAccessor`, then deploy/update with:

   ```powershell
   gcloud run services update linguaquest-api --region asia-southeast1 --project english-f3d71 --set-secrets GEMINI_API_KEY=linguaquest-gemini-key:latest
   ```

   Without this secret, the API reports that AI is not configured and returns clearly labeled starter missions. It does not claim that those missions came from AI.
5. Deploy Hosting and the existing Firestore rules:

   ```powershell
   firebase deploy --only hosting,firestore:rules --project english-f3d71
   ```

Firebase Hosting proxies `/api/**` to the Cloud Run service in `asia-southeast1`. For local testing, serve the site through Firebase Hosting's emulator and run the Python service separately; opening `index.html` as a `file://` URL cannot reach `/api`.

For GitHub Pages, add the Cloud Run base URL as the repository variable `LINGUA_API_BASE_URL`; the Pages workflow injects it into `api-config.js`. The API allows requests from `https://brogays.github.io` via `WEB_ORIGINS`.

## API behavior

- `POST /api/v1/migrate` imports the current browser's learned-word list once per signed-in Firebase account.
- `POST /api/v1/events` records study days, word learning/reviews, and completed mission IDs.
- `GET /api/v1/dashboard` returns learned/due counts, words due at least 12 hours after their last learning/review, current streak, weekly minutes, and that day's saved mission set.
- Gemini receives only study counts, streak, and at most ten due-word spellings—never the Firebase UID, email, or profile.
