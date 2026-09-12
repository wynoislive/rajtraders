import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
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
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "ioredis",
      "bullmq",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
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
