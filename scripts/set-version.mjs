#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: set-version.mjs <version>');
  process.exit(1);
}

function bumpPackageJson(path) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  bumped ${path}`);
}

function bumpAppJson(path) {
  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  cfg.expo.version = version;
  writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`  bumped ${path}`);
}

console.log(`Setting version → ${version}`);
bumpPackageJson('package.json');
bumpPackageJson('apps/web/package.json');
bumpPackageJson('apps/mobile/package.json');
bumpPackageJson('apps/desktop/package.json');
bumpPackageJson('packages/core/package.json');
bumpPackageJson('packages/db/package.json');
bumpPackageJson('packages/ui/package.json');
bumpAppJson('apps/mobile/app.json');
