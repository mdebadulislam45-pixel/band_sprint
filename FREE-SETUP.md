# BandSprint — Free Setup, Management & Future Updates
Written for Imran, who does not code much. Everything below is $0 to start.

## 1. What you need (only 3 things)
1. A Google account — for Firebase + Gemini.
2. A Gemini API key — free from https://aistudio.google.com/app/apikey
3. This project folder (BandSprint).

No server to buy. No monthly fee. The only optional cost is a domain
(about $10-12/year). You can start with the free address `bandsprint.web.app`.

## 2. Free plan — what is free, and the limits
| Thing | Free plan | Limit to watch |
|---|---|---|
| Database — Firestore (Spark plan) | $0 | 50,000 reads/day, 20,000 writes/day, 1 GB storage. Enough for ~500-1,000 users/day. |
| Login — Firebase Auth | $0 | 50,000 users/month free (email + Google login). Phone login costs money — do not turn it on. |
| Website hosting — Firebase Hosting | $0 | 10 GB storage, 360 MB transfer/day. This is the tightest limit. If the site pauses for a day, that limit was hit. |
| Server — Cloud Run | $0 under limits | 2 million requests/month, 180,000 vCPU-seconds/month. Needs a billing account on file, but $0 if you stay under the limits. Set a $5 budget alert. |
| AI — Gemini API | $0 under limits | Free-tier tokens on Flash-Lite models. Verified 2026-11-19 on Imran's key: gemini-3.5-flash-lite and gemini-3.1-flash-lite answer in seconds; gemini-3.8-flash and gemini-3.5-flash timed out after 120s, so the app now defaults to 3.5-flash-lite. If many users use AI at the same time, some will see "try again in a minute". |
| Payments — Stripe | $0 to set up | Stripe only takes a % when someone actually pays you. |

If a free limit is hit on Firebase Spark, the service pauses until the
limit resets — it does NOT charge you. That is why Spark is safe for you.
Do NOT upgrade to Blaze until you are making money, and when you do,
set a budget alert first.

## 3. Setup — do these in order (15 minutes)
1. Download the BandSprint zip, unzip it.
2. In the folder, copy `.env.example` to a new file called `.env`.
3. Open `.env`, paste your Gemini key after `GEMINI_API_KEY=`.
   Do NOT share this file or your key with anyone.
4. Open a terminal in the folder and run:
   ```
   npm install
   npm run build
   ```
   Build must say "built in …s" with no errors. If it fails, send me the error.
5. Test locally:
   ```
   npm run dev
   ```
   Open http://localhost:3000 — log in, try 1 mock test, try Speaking and Writing.
6. Deploy the website (free):
   - Easiest: Firebase Hosting. Install the Firebase tools once:
     `npm install -g firebase-tools`, then `firebase login`, then
     `firebase deploy --only hosting`
     Your site will be at `https://bandsprint.web.app` (your Firebase project name may differ).
   - Or drag-and-drop the `dist/` folder into Netlify Drop (free).
   - The full app with the AI server needs Cloud Run too — ask Muse to
     walk you through that step when you are ready to go live with AI.
     Do NOT put your Gemini key in the frontend code — it stays in `.env`
     / in the hosting secrets, never in GitHub.

## 4. Management — what you do every week (no coding)
- Firebase Console (console.firebase.google.com) → your project
  `my-exam-portal-668a9`:
  - Authentication → see users, block a bad user if needed.
  - Firestore Database → see test scores, submissions, user data.
  - Hosting → see how much transfer you used.
  - Usage and billing → check you are still under the free limits.
- Once a week: export Firestore data (Firestore → Import/Export → Export).
  Keep that backup file. It is your users' data.
- Once a month: check the Gemini usage in Google AI Studio.
  If you see many "rate limit" errors, we need to add a queue or upgrade the AI tier.

## 5. Future updates & changes — how we do them
You never edit code directly. Do this:
1. Tell Muse in plain words what you want:
   "Add 10 new Reading mocks" / "Fix the login button" / "Change the price".
2. Muse changes the code here, rebuilds it, and tests it.
3. You download the new zip, run `npm run build` again to confirm,
   then deploy the same way as in step 3.6 above.
4. Keep the old zip as a backup. If the new version breaks, deploy the old one.

Rules that keep you safe:
- Never edit the live site directly. Always test locally first.
- Never commit `.env` to GitHub. It is already in `.gitignore`.
- Never use the words "Official Cambridge", "Authentic Cambridge",
  or fake certificates in the app. Use "BandSprint", "IELTS-style practice".
- When Google retires a Gemini model (like Gemini 2.5 on 1 Dec 2026),
  tell Muse — the model name is changed in one place in the code.

## 6. When you will need to pay (later, not now)
- More than ~1,000 users/day → Firestore / Hosting limits → switch to Blaze,
  pay only for what you use over the free limits, with a $5-10 budget alert.
- Many AI users at once → Gemini paid tier, or add a daily AI limit per user.
- A custom domain → ~$10-12/year.
- Until then: $0.
