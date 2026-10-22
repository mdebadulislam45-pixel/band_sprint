import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const buildDir = path.resolve(rootDir, 'build');

try {
  if (fs.existsSync(distDir)) {
    // Ensure build directory exists and syncs all artifacts
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    fs.cpSync(distDir, buildDir, { recursive: true });
    console.log('[IELTS Sprint Build] Successfully synchronized dist/ -> build/ for deployment artifact staging.');
  } else {
    console.warn('[IELTS Sprint Build] Warning: dist/ directory not found after build.');
  }
} catch (err) {
  console.error('[IELTS Sprint Build] Error syncing build artifacts:', err);
  process.exit(1);
}
