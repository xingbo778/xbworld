#!/usr/bin/env node
/**
 * Post-build static checker for Legacy compatibility.
 *
 * Analyzes the built TS bundle and webclient.min.js to detect:
 * 1. exposeToLegacy functions that don't exist in Legacy
 * 2. Return value property name mismatches (camelCase vs snake_case)
 * 3. Initialization/orchestration functions being overridden
 * 4. Module-local variables being accessed via window
 *
 * Usage: node scripts/check-legacy-compat.js
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = path.join(__dirname, '..', 'src', 'main', 'webapp', 'javascript', 'ts-bundle', 'main.js');
const LEGACY_PATH = path.join(__dirname, '..', 'src', 'main', 'webapp', 'javascript', 'webclient.min.js');

// Known initialization functions that MUST NOT be overridden
// NOTE: Functions that have been FULLY migrated to TS (Legacy file removed)
// should be removed from this list. They are no longer "overrides" but
// the sole implementation.
const FORBIDDEN_OVERRIDES = [
  'map_allocate', 'tile_init', 'map_init_topology',
  'game_init', 'improvements_init', 'init_overview',
  'set_client_state', 'init_mapview',
  'setup_window_size', 'tileset_init',
  // Phase 5: network_init REMOVED — clinet.js deleted, connection.ts is sole impl
];

// Known module-local variables in Legacy (not on window)
const MODULE_LOCAL_VARS = [
  'improvements_name_index',  // improvement.js
  'terrain_control',          // packhand.js
  'roads',                    // packhand.js
  'bases',                    // packhand.js
  'page_msg',                 // packhand.js
  'auto_attack_actions',      // packhand.js
  'ws',                       // clinet.js
  'civserverport',            // clinet.js
  'ping_timer',               // clinet.js
];

// Return value properties that must use snake_case for Legacy compat
const SNAKE_CASE_RETURNS = {
  'NATIVE_TO_MAP_POS': ['map_x', 'map_y'],
  'MAP_TO_NATIVE_POS': ['nat_x', 'nat_y'],
  'MAP_TO_NATURAL_POS': ['nat_y', 'nat_x'],
  'NATURAL_TO_MAP_POS': ['map_x', 'map_y'],
};

let errors = 0;
let warnings = 0;

function error(msg) { errors++; console.error(`  \x1b[31mERROR\x1b[0m: ${msg}`); }
function warn(msg) { warnings++; console.warn(`  \x1b[33mWARN\x1b[0m:  ${msg}`); }
function pass(msg) { console.log(`  \x1b[32mOK\x1b[0m:    ${msg}`); }

console.log('\n=== Legacy Compatibility Check ===\n');

// --- Check 1: Bundle exists ---
if (!fs.existsSync(BUNDLE_PATH)) {
  error(`TS bundle not found: ${BUNDLE_PATH}`);
  error('Run "npx vite build" first');
  process.exit(1);
}
pass('TS bundle found');

const bundle = fs.readFileSync(BUNDLE_PATH, 'utf-8');
const legacy = fs.existsSync(LEGACY_PATH) ? fs.readFileSync(LEGACY_PATH, 'utf-8') : '';

// --- Check 2: Extract all exposeToLegacy registrations ---
// In the minified bundle, exposeToLegacy is typically called as: q("name", fn)
// where q is the minified name of exposeToLegacy
// We look for the pattern: window["name"] = or window.name =
const windowAssignments = [];
const exposePattern = /window\["([^"]+)"\]\s*=/g;
let match;
while ((match = exposePattern.exec(bundle)) !== null) {
  windowAssignments.push(match[1]);
}

// Also check for the exposeToLegacy function pattern in source
const sourceFiles = [];
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) scanDir(path.join(dir, f.name));
    else if (f.name.endsWith('.ts') && !f.name.endsWith('.test.ts') && !f.name.endsWith('.d.ts'))
      sourceFiles.push(path.join(dir, f.name));
  }
}
scanDir(path.join(__dirname, '..', 'src', 'ts'));

const exposedNames = [];
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const re = /exposeToLegacy\(\s*'([^']+)'/g;
  while ((match = re.exec(content)) !== null) {
    exposedNames.push({ name: match[1], file: path.relative(path.join(__dirname, '..'), file) });
  }
}

console.log(`\nFound ${exposedNames.length} exposeToLegacy registrations\n`);

// --- Check 3: Forbidden overrides ---
console.log('--- Checking forbidden overrides ---');
let forbiddenFound = 0;
for (const { name, file } of exposedNames) {
  if (FORBIDDEN_OVERRIDES.includes(name)) {
    error(`"${name}" is an initialization function and MUST NOT be overridden (${file})`);
    forbiddenFound++;
  }
}
if (forbiddenFound === 0) pass('No forbidden overrides detected');

// --- Check 4: Return value property names ---
console.log('\n--- Checking return value property names ---');
for (const [funcName, expectedProps] of Object.entries(SNAKE_CASE_RETURNS)) {
  // Check if the function exists in the bundle
  const isExposed = exposedNames.some(e => e.name === funcName);
  if (!isExposed) continue;

  // Look for camelCase versions in the bundle near the function
  for (const prop of expectedProps) {
    const camelCase = prop.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // Check if the bundle contains the camelCase property name near the function
    if (bundle.includes(`${camelCase}:`) && !bundle.includes(`${prop}:`)) {
      error(`"${funcName}" may return {${camelCase}} instead of {${prop}} (Legacy expects snake_case)`);
    } else {
      pass(`"${funcName}" uses correct property name "${prop}"`);
    }
  }
}

// --- Check 5: Module-local variable access ---
console.log('\n--- Checking module-local variable access ---');
for (const varName of MODULE_LOCAL_VARS) {
  // Check if any TS source tries to access window.varName
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const patterns = [
      `window).${varName}`,
      `window["${varName}"]`,
      `window['${varName}']`,
    ];
    for (const pat of patterns) {
      if (content.includes(pat)) {
        warn(`"${varName}" is a module-local variable in Legacy, but accessed via window in ${path.relative(path.join(__dirname, '..'), file)}`);
      }
    }
  }
}
pass('Module-local variable check complete');

// --- Check 6: Verify Legacy functions exist ---
console.log('\n--- Checking Legacy function existence ---');
if (legacy) {
  let missingCount = 0;
  for (const { name, file } of exposedNames) {
    // Skip constants (all uppercase or starts with uppercase)
    if (name === name.toUpperCase() || /^[A-Z][A-Z_]+$/.test(name)) continue;
    // Skip UCF_ and UTYF_ constants
    if (name.startsWith('UCF_') || name.startsWith('UTYF_')) continue;

    // Check if the function name exists in Legacy code
    if (!legacy.includes(`function ${name}`) && !legacy.includes(`${name}=function`) && !legacy.includes(`var ${name}`)) {
      warn(`"${name}" exposed to Legacy but not found as function/var in webclient.min.js (${file})`);
      missingCount++;
    }
  }
  if (missingCount === 0) pass('All exposed functions exist in Legacy');
  else warn(`${missingCount} exposed names not found in Legacy (may be new additions)`);
} else {
  warn('webclient.min.js not found, skipping Legacy existence check');
}

// --- Check 7: Detect potential SINGLE_MOVE-like issues ---
console.log('\n--- Checking for module variable vs window global issues ---');
const globalVarPattern = /(?:let|const|var)\s+(SINGLE_MOVE|TILE_UNKNOWN|TILE_KNOWN_UNSEEN|TILE_KNOWN_SEEN)\b/;
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const m = globalVarPattern.exec(content);
  if (m && content.includes('exposeToLegacy')) {
    // Check if the variable is used in functions that are exposed
    // This is a heuristic - if a module declares a variable AND exposes functions,
    // those functions might use the module variable instead of window
    warn(`"${m[1]}" declared as module variable in ${path.relative(path.join(__dirname, '..'), file)} — ensure exposed functions use window.${m[1]} if set by Legacy`);
  }
}

// --- Summary ---
console.log('\n=== Summary ===');
console.log(`  Registrations: ${exposedNames.length}`);
console.log(`  Errors: ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors > 0) {
  console.log(`\n\x1b[31mFAILED: ${errors} error(s) found\x1b[0m\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n\x1b[33mPASSED with ${warnings} warning(s)\x1b[0m\n`);
  process.exit(0);
} else {
  console.log(`\n\x1b[32mALL CHECKS PASSED\x1b[0m\n`);
  process.exit(0);
}
