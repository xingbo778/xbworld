# JavaScript → TypeScript Migration Guide

## Overview

The XBWorld web client is being gradually migrated from vanilla JavaScript
(global vars, no modules) to TypeScript with ES modules. This is a
non-breaking, incremental process.

## Current State

- **54 JS files** (~22,000 lines) in `src/main/webapp/javascript/`
- **Build**: Maven + Closure Compiler → `webclient.min.js`
- **New build**: Vite + TypeScript (runs alongside Maven for now)
- **Type definitions**: `javascript/types/global.d.ts` declares existing globals

## How to Migrate a File

### 1. Create the TypeScript version

```bash
cp javascript/utility.js javascript/utility.ts
```

### 2. Add types gradually

```typescript
// Before (JS)
function get_unit_name(unit) {
  return unit_types[unit.type].name;
}

// After (TS)
function get_unit_name(unit: UnitInfo): string {
  return unit_types[unit.type].name;
}
```

### 3. Use imports instead of globals (for new code)

```typescript
import { Activity } from './types/fc_types';
if (unit.activity === Activity.IDLE) { ... }
```

### 4. Keep backward compatibility

Migrated files should still assign to `window` for anything that other
non-migrated files need:

```typescript
export function myFunction() { ... }
(window as any).myFunction = myFunction;
```

## Build Commands

```bash
cd xbworld-web/src/main/webapp

# Development server with hot reload (port 3000, proxies API to 8080)
npm run dev

# Production build
npm run build

# Type checking only
npm run typecheck
```

## Priority Files for Migration

1. **`fc_types.js`** → `types/fc_types.ts` (done — constants only)
2. **`utility.js`** — pure functions, no DOM
3. **`bitvector.js`** — small, self-contained
4. **`connection.js`** — small, network-related
5. **`clinet.js`** — WebSocket handling
6. **`control.js`** — largest file (3,500 lines), should be split into:
   - `control/input.ts` — keyboard/mouse handlers
   - `control/focus.ts` — unit focus management
   - `control/orders.ts` — unit order commands
   - `control/chat.ts` — chat system
   - `control/goto.ts` — goto/pathfinding

## Native API Replacements

| jQuery | Native | Module |
|--------|--------|--------|
| `$(selector)` | `document.querySelector()` | `utils/dom.ts` |
| `$.ajax()` | `fetch()` | `utils/dom.ts` |
| `$.getUrlVar()` | `URLSearchParams` | `utils/dom.ts` |
| `$(el).show()` | `el.style.display = ''` | `utils/dom.ts` |
| `$(el).hide()` | `el.style.display = 'none'` | `utils/dom.ts` |
| `$(el).on()` | `el.addEventListener()` | `utils/dom.ts` |

jQuery UI (tabs, dialogs) should be the **last** thing to replace, as it's
deeply integrated into the game UI.
