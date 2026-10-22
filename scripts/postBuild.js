import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const buildDir = path.resolve(rootDir, 'build');
const outDir = path.resolve(rootDir, 'out');

try {
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    if (files.length === 0) {
      console.error('[IELTS Sprint Build] Error: dist/ directory is empty.');
      process.exit(1);
    }

    // Mirror to build/
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    fs.cpSync(distDir, buildDir, { recursive: true });

    // Mirror to out/
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.cpSync(distDir, outDir, { recursive: true });

    console.log(`[IELTS Sprint Build] Artifacts successfully validated: ${files.length} top-level entries synchronized across dist/, build/, and out/.`);
  } else {
    console.error('[IELTS Sprint Build] Fatal: dist/ directory does not exist after build.');
    process.exit(1);
  }
} catch (err) {
  console.error('[IELTS Sprint Build] Error syncing build artifacts:', err);
  process.exit(1);
}

