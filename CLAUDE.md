# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **tmi.js**, a TypeScript library for the Twitch Messaging Interface. It's a client for connecting to Twitch IRC chat via WebSocket. The library supports both Node.js and browser environments.

**Important Context:**
- This is a fork of https://github.com/tmijs/tmi.js forked to https://github.com/Kirdow/tmi.js
- Migrated from JavaScript/CommonJS to TypeScript 5.4.5 with ESM
- Uses the `ws` package for WebSocket connections in Node.js
- Browser builds use native WebSocket API

## Development Commands

### Validation
```bash
./validate.sh              # Full validation: type check + build + tests
./validate.sh --no-test    # Skip tests
./validate.sh --skip-build # Type check only (no build)
./validate.sh --update     # Force npm install
```

### Testing
```bash
npm test                   # Run Vitest tests
npm run test:watch         # Watch mode for tests
```

**Running a Single Test:**
```bash
npx vitest test/commands.test.ts              # Run specific test file
npx vitest test/commands.test.ts -t "ping"    # Run tests matching pattern
```

### Building
```bash
npm run build              # Full build: clean + TypeScript + browser bundles
npm run build:tsc          # Compile TypeScript only (ESM output to dist/)
npm run build:browser      # Build browser bundles only (browser/tmi.js + tmi.min.js)
npm run typecheck          # Type check without emitting files
```

The build process:
1. TypeScript compiles `src/` to `dist/` (ESM + type definitions)
2. esbuild bundles `dist/index.js` to `browser/` (IIFE format, global name `tmi`)
3. Browser bundles: `tmi.js` (70KB) and `tmi.min.js` (36KB minified)

## Architecture

### Source Structure (TypeScript)

```
src/
  ├── index.ts              # Entry point, exports Client + all types
  ├── types.ts              # All TypeScript interfaces and types
  └── lib/
      ├── Client.ts         # User-facing API with all Twitch commands (extends ClientBase)
      ├── ClientBase.ts     # Core client implementation (connection, message handling, events)
      ├── parser.ts         # IRC message parser (tags, badges, emotes)
      ├── utils.ts          # Helper utilities (channel/username normalization, IRC escaping)
      ├── EventEmitter.ts   # Custom EventEmitter implementation
      ├── Logger.ts         # Logging utility with LogLevel type
      └── Queue.ts          # Simple queue for rate-limited operations
```

### Output Structure

```
dist/                       # Compiled TypeScript (ESM + .d.ts files) - gitignored
  ├── index.js + index.d.ts
  ├── types.js + types.d.ts
  └── lib/*.js + *.d.ts

browser/                    # Browser bundles (IIFE) - gitignored
  ├── tmi.js               # Full bundle
  └── tmi.min.js           # Minified bundle + source map
```

### Key Architectural Patterns

**1. Inheritance Hierarchy:**
- `Client` extends `ClientBase` extends `EventEmitter`
- `ClientBase` contains all connection logic and message handling (1500+ lines)
- `Client` adds user-facing command methods (ban, timeout, say, etc.)

**2. Message Flow:**
```
WebSocket message → _onMessage() → handleMessage() → parser.msg() → emit events
```

**3. Command Execution Pattern:**
All commands in `Client.ts` follow this pattern:
- Call `_sendCommand()` or `_sendMessage()` from ClientBase
- Return a Promise that resolves/rejects based on internal `_promise*` events
- Example: `ban()` → `_sendCommand()` → waits for `_promiseBan` event

**4. Connection Management (ClientBase.ts):**
- `connect()` - Creates WebSocket connection to Twitch IRC
- `_openConnection()` - Opens WebSocket (uses `ws` in Node.js, native in browser)
- Automatic reconnection with exponential backoff (configurable)
- Ping/pong mechanism to detect dead connections (60s interval)
- Queue-based channel joining to avoid rate limits (default 2s interval, min 300ms)

**5. Event System:**
- Custom EventEmitter implementation (typed)
- `emits()` helper to emit multiple events with different payloads
- Internal promise events prefixed with `_promise` (e.g., `_promiseJoin`)
- User-facing events: `message`, `join`, `part`, `whisper`, `connected`, etc.

**6. Rate Limiting:**
- `Queue.ts` provides sequential execution with delays
- Used for joining channels on connect to avoid Twitch rate limits
- Each queue item has optional custom delay or uses default

### Important Files to Know

**ClientBase.ts (1500+ lines):**
- Contains the majority of the implementation
- `handleMessage()` is the main message dispatcher - handles PING/PONG, JOIN/PART, PRIVMSG, NOTICE, ROOMSTATE, etc.
- Connection logic in `connect()`, `_openConnection()`, `_onOpen()`, `_onClose()`, `_onError()`, `_onMessage()`
- Message sending logic: `_sendCommand()` and `_sendMessage()`
- WebSocket detection: Uses `require('ws')` in Node.js (wrapped in try/catch for browser compatibility)

**Client.ts:**
- Thin wrapper that adds command methods
- Each method corresponds to a Twitch chat command
- Many methods have aliases (e.g., `leave` = `part`, `slowmode` = `slow`)
- Special handling for `say()` - detects if message is a command or action

**parser.ts:**
- `msg(data)` - Main IRC message parser
- Parses IRCv3 tags, prefix, command, and parameters
- Helper functions for badges, badge-info, and emotes
- BSD license header preserved from original implementation

**utils.ts:**
- Channel/username normalization (adds/removes `#` prefix)
- IRC escape/unescape for message tags
- Token and password handling
- `justinfan` username generation for anonymous users

**types.ts:**
- All TypeScript interfaces exported from main index
- Key types: `ChatUserstate`, `SubGiftUserstate`, `GlobalUserstate`, `ClientOptions`, `OutgoingTags`
- Options namespace with `Options.Connection`, `Options.Identity`, etc.

### Browser vs Node.js

The library works in both environments:
- **Node.js**: Uses `ws` package for WebSocket (dynamic require in ClientBase.ts)
- **Browser**: Uses native `WebSocket` API, `ws` require fails gracefully
- Detection in `getWebSocket()` function checks for `global.WebSocket` first

## Testing

Test files in `test/`:
- `commands.test.ts` - Vitest tests for command methods (34 passing tests)
- Old Mocha tests (`*.js`) still present for reference but not actively used

Tests use:
- **Vitest** - Modern test runner with ESM support
- **WebSocketServer** from `ws` - Mock Twitch IRC server for integration tests
- Async/await patterns instead of callbacks
- Test pattern: Create mock server → connect client → send IRC responses → assert results

## Contributing / Commit Format

When making commits, follow the format defined in CONTRIBUTING.md:
- Format: `<scope>: subject` (all lowercase)
- Scope = filename without extension
- Examples:
  - `client: add support for new command`
  - `utils: fix channel name normalization`
  - `parser: improve emote parsing`

## TypeScript Notes

- **Target**: ESNext with ESM modules
- **Strict mode**: Enabled with full type checking
- **Type definitions**: Auto-generated from source (no manual `.d.ts` files)
- **Module resolution**: "bundler" mode for modern build tools
- Same class hierarchy maintained: `Client extends ClientBase extends EventEmitter`
- Custom EventEmitter kept (not Node's native one) for browser compatibility
- IRC parser BSD license preserved in `parser.ts`
