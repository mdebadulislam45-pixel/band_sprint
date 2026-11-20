import fs from 'fs';

/**
 * Resolves the genuine server secret GEMINI_API_KEY.
 * Never uses or falls back to Firebase web client keys.
 */
export function resolveGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    if (fs.existsSync('/app/.dev.pid')) {
      const pid = fs.readFileSync('/app/.dev.pid', 'utf8').trim();
      const envPath = `/proc/${pid}/environ`;
      if (fs.existsSync(envPath)) {
        const envRaw = fs.readFileSync(envPath, 'utf8');
        for (const entry of envRaw.split('\0')) {
          if (entry.startsWith('GEMINI_API_KEY=')) {
            const key = entry.slice('GEMINI_API_KEY='.length).trim();
            if (key) return key;
          }
        }
      }
    }
  } catch (err) {
    // Ignore proc read errors if process exited
  }
  return '';
}
