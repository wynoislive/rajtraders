import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  const { copyFile, readdir, mkdir } = await import("node:fs/promises");

  const commonOptions = {
    platform: "node",
    bundle: true,
    format: "esm",
    logLevel: "info",
    sourcemap: "linked",
    external: [
      "*.node",
      "@electric-sql/pglite",
      "@electric-sql/pglite/*",
      "pg",
      "pg-native",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
    ],
    plugins: [],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  };

  // Build dist/index.mjs and dist/app.mjs
  await esbuild({
    ...commonOptions,
    entryPoints: {
      index: path.resolve(artifactDir, "src/index.ts"),
      app: path.resolve(artifactDir, "src/app.ts"),
    },
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
  });

  // Copy PGlite WASM assets into dist output directory for serverless deployment
  const pgliteDist = path.resolve(artifactDir, "node_modules/@electric-sql/pglite/dist");
  try {
    const files = await readdir(pgliteDist);
    for (const file of files) {
      if (file.endsWith(".wasm")) {
        await copyFile(path.resolve(pgliteDist, file), path.resolve(distDir, file));
        console.log(`Copied ${file} to dist/`);
      }
    }
  } catch (err) {
    console.warn("Notice: PGlite WASM file copy skipped:", err.message);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
