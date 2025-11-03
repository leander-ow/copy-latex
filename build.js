import fs from 'fs';
import path from 'path';
import archiver from 'archiver'; 

// -------------------------
// 1. Get target platform
// -------------------------
const target = process.argv[2]; // Expected values: "chrome" or "firefox"
if (!target || !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node build.js <chrome|firefox>');
  process.exit(1);
}
console.log(`Building extension for ${target}...`);

// -------------------------
// 2. Define paths
// -------------------------
const SRC_DIR = path.join(process.cwd(), 'src'); // Source folder with all JS, CSS, HTML, icons
const MANIFEST_FILE = path.join(process.cwd(), `manifests/manifest.${target}.json`);
const BUILD_DIR = path.join(process.cwd(), 'build');

// -------------------------
// 3. Clean build directory
// -------------------------
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  console.log('Removed old build folder.');
}
fs.mkdirSync(BUILD_DIR);
console.log('Created new build folder.');

// -------------------------
// 4. Copy source files to build
// -------------------------
fs.cpSync(SRC_DIR, BUILD_DIR, { recursive: true });
console.log('Copied source files to build folder.');

// -------------------------
// 5. Copy the correct manifest
// -------------------------
if (!fs.existsSync(MANIFEST_FILE)) {
  console.error(`Manifest file for ${target} does not exist.`);
  process.exit(1);
}
fs.copyFileSync(MANIFEST_FILE, path.join(BUILD_DIR, 'manifest.json'));
console.log(`Copied ${target} manifest to build folder.`);

// -------------------------
// 6. Create ZIP for store upload
// -------------------------
const zipPath = path.join(process.cwd(), `build-${target}.zip`);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`ZIP file created: ${zipPath} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => { throw err; });

// Add all files from the build folder to the ZIP
archive.directory(BUILD_DIR, false);
archive.pipe(output);
archive.finalize();
