# IELTS Sprint Masterguide — Complete Source Code ZIP

The complete source code archive for **IELTS Sprint Masterguide** is packaged and available for direct download.

## Download Links

1. **Direct API Endpoint**:
   - [Download ielts-sprint-source-code.zip](/api/download-source-zip)
2. **ZIP File Path**:
   - `ielts-sprint-source-code.zip` (Stored at `.aistudio/artifacts/brain/699dcfb1-0ba7-42d7-9ef6-d3f600639472/ielts-sprint-source-code.zip` and `/public/ielts-sprint-source-code.zip`)

---

## Archive Contents (16 Verified Files)

| File | Description |
| :--- | :--- |
| `server.ts` | Complete production Express server with 27 endpoints, 24kHz studio neural audio engine, Google OAuth, Stripe webhook handlers, and Cambridge evaluators. |
| `src/App.tsx` | Main interactive candidate dashboard with Multi-Accent Listening Lab, Speaking Turn Evaluator, Writing Diagnostic, and Cambridge AI Tutor. |
| `src/main.tsx` | Application entry point mounting React 19 root. |
| `src/index.css` | Global Tailwind CSS stylesheet. |
| `src/vite-env.d.ts` | Vite client types declarations. |
| `src/server/auth.ts` | Authentication, PBKDF2 secure password hashing, and Google OAuth token verification. |
| `src/server/billing.ts` | Stripe subscription management, webhook verification, and entitlement checks. |
| `src/server/db.ts` | In-memory and persistent database storage layer for candidate records. |
| `src/services/sourceZipService.ts` | Pure Node.js uncorrupted standard PKZIP builder service. |
| `package.json` | Project dependencies and build scripts. |
| `tsconfig.json` | TypeScript configuration. |
| `vite.config.ts` | Vite build and dev server configuration. |
| `index.html` | HTML5 entry template with viewport and meta tags. |
| `metadata.json` | AI Studio applet manifest and capabilities. |
| `.env.example` | Environment variable template for Gemini API key, Google OAuth, and Stripe. |
| `README.md` | Quickstart instructions and documentation. |

---

## Quickstart Instructions
```bash
# 1. Unzip archive
unzip ielts-sprint-source-code.zip -d ielts-sprint

# 2. Enter directory & install dependencies
cd ielts-sprint
npm install

# 3. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY in .env

# 4. Start local full-stack dev server (port 3000)
npm run dev
```
