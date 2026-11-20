import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const buildDir = path.resolve(rootDir, 'build');
const outDir = path.resolve(rootDir, 'out');
const publicAiStudioDir = path.resolve(rootDir, 'public', 'assets', 'aistudio');
const distAiStudioDir = path.resolve(distDir, 'assets', 'aistudio');

try {
  // Remove temporary chat attachment directories and binary zip archives so they never break deployment
  for (const target of [
    publicAiStudioDir,
    distAiStudioDir,
    buildDir,
    outDir,
    path.resolve(rootDir, 'public', 'bandsprint-source-code.zip'),
    path.resolve(distDir, 'bandsprint-source-code.zip')
  ]) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    if (files.length === 0) {
      console.error('[BandSprint Build] Error: dist/ directory is empty.');
      process.exit(1);
    }
    console.log(`[BandSprint Build] Artifacts validated: ${files.length} top-level entries in dist/.`);
  } else {
    console.error('[BandSprint Build] Fatal: dist/ directory does not exist after build.');
    process.exit(1);
  }
} catch (err) {
  console.error('[BandSprint Build] Error validating build artifacts:', err);
  process.exit(1);
}
