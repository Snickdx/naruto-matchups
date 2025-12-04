import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { transform } from 'esbuild';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = pkg.version;

// Copy directory recursively
function copyDirSync(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Minify JavaScript
async function minifyJS(code) {
  const result = await transform(code, {
    minify: true,
    target: 'es2018'
  });
  return result.code;
}

// Plugin to inject version and copy static files
function versionInjector() {
  return {
    name: 'version-injector',
    // Log version on build start
    buildStart() {
      console.log(`\n📦 Building Naruto Matchups v${version}\n`);
    },
    // Replace __APP_VERSION__ in HTML (works in both dev and build)
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/__APP_VERSION__/g, version);
      }
    },
    // Replace __APP_VERSION__ in JS files (works in both dev and build)
    transform(code, id) {
      if (id.endsWith('.js') || id.endsWith('.ts')) {
        return code.replace(/__APP_VERSION__/g, version);
      }
    },
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const srcDir = resolve(__dirname, 'src');
      
      // Copy and update service worker (minified)
      try {
        let swContent = readFileSync(join(srcDir, 'sw.js'), 'utf-8');
        swContent = swContent.replace(/__APP_VERSION__/g, version);
        swContent = await minifyJS(swContent);
        writeFileSync(join(distDir, 'sw.js'), swContent);
        console.log(`✅ Service worker minified with version ${version}`);
      } catch (e) {
        console.warn('⚠️ Could not process service worker:', e.message);
      }
      
      // Copy and update manifest (minified JSON)
      try {
        let manifestContent = readFileSync(join(srcDir, 'manifest.json'), 'utf-8');
        manifestContent = manifestContent.replace(/__APP_VERSION__/g, version);
        const manifest = JSON.parse(manifestContent);
        writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(manifest));
        console.log(`✅ Manifest minified with version ${version}`);
      } catch (e) {
        console.warn('⚠️ Could not process manifest:', e.message);
      }
      
      // Copy matchups.json (minified)
      try {
        const matchups = JSON.parse(readFileSync(join(srcDir, 'matchups.json'), 'utf-8'));
        writeFileSync(join(distDir, 'matchups.json'), JSON.stringify(matchups));
        console.log(`✅ Matchups data minified`);
      } catch (e) {
        console.warn('⚠️ Could not process matchups:', e.message);
      }
      
      // Copy img folder
      try {
        copyDirSync(join(srcDir, 'img'), join(distDir, 'img'));
        console.log(`✅ Images copied`);
      } catch (e) {
        console.warn('⚠️ Could not copy images:', e.message);
      }
      
      // Copy icons folder
      try {
        copyDirSync(join(srcDir, 'icons'), join(distDir, 'icons'));
        console.log(`✅ Icons copied`);
      } catch (e) {
        console.warn('⚠️ Could not copy icons:', e.message);
      }
    }
  };
}

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [versionInjector()],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  esbuild: {
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
});
