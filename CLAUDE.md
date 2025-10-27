# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **tmi.js**, a JavaScript library for the Twitch Messaging Interface. It's a client for connecting to Twitch IRC chat via WebSocket. The library supports both Node.js and browser environments.

**Important Context:**
- This is a fork of https://github.com/tmijs/tmi.js forked to https://github.com/Kirdow/tmi.js
- The goal is to port this codebase to native TypeScript
- Currently written in JavaScript with type definitions in `types.d.ts`
- Uses the `ws` package for WebSocket connections in Node.js

## Development Commands

### Testing
```bash
npm test                 # Run both ESLint and Mocha tests
npm run test:eslint      # Run ESLint only on index.js, lib/*, test/*
npm run eslint-fix       # Auto-fix ESLint issues
npm run test:mocha       # Run Mocha tests with nyc coverage
```

**Running a Single Test:**
```bash
npx mocha test/commands.js          # Run a specific test file
npx mocha test/events.js --grep "message"  # Run tests matching a pattern
```

### Building
```bash
npm run build            # Build both normal and minified browser versions + SRI hashes
npm run build:esbuild    # Build browser versions only (dist/tmi.js and dist/tmi.min.js)
npm run build:sri        # Generate SRI hashes for dist files
```

The build process uses esbuild (see `scripts/esbuild.js`) to create browser bundles in IIFE format with global name `tmi`.

### Linting
ESLint configuration in `.eslintrc.js` enforces:
- Tabs for indentation (not spaces)
- Stroustrup brace style
- No blank lines before `return` or `break`
- Single quotes
- No semicolons are NOT allowed (semicolons are required)

## Architecture

### Core Module Structure

```
index.js                  # Entry point, exports Client class
lib/
  ├── Client.js           # User-facing API with all Twitch commands (extends ClientBase)
  ├── ClientBase.js       # Core client implementation (connection, message handling, events)
  ├── parser.js           # IRC message parser (tags, badges, emotes)
  ├── utils.js            # Helper utilities (channel/username normalization, IRC escaping)
  ├── EventEmitter.js     # Custom EventEmitter implementation
  ├── Logger.js           # Logging utility
  └── Queue.js            # Simple queue for rate-limited operations
```

### Key Architectural Patterns

**1. Inheritance Hierarchy:**
- `Client` extends `ClientBase` extends `EventEmitter`
- `ClientBase` contains all connection logic and message handling
- `Client` adds user-facing command methods (say, ban, timeout, etc.)

**2. Message Flow:**
```
WebSocket message → _onMessage() → handleMessage() → parser.msg() → emit events
```

**3. Command Execution Pattern:**
All commands in `Client.js` follow this pattern:
- Call `_sendCommand()` or `_sendMessage()` from ClientBase
- Return a Promise that resolves/rejects based on internal `_promise*` events
- Example: `ban()` → `_sendCommand()` → waits for `_promiseBan` event

**4. Connection Management (ClientBase.js):**
- `connect()` - Creates WebSocket connection to Twitch IRC
- `_openConnection()` - Opens WebSocket with ws library
- Automatic reconnection with exponential backoff (configurable)
- Ping/pong mechanism to detect dead connections (60s interval)
- Queue-based channel joining to avoid rate limits (default 2s interval, min 300ms)

**5. Event System:**
- Custom EventEmitter implementation (not Node's native one)
- `emits()` helper to emit multiple events with different payloads
- Internal promise events prefixed with `_promise` (e.g., `_promiseJoin`)
- User-facing events: `message`, `join`, `part`, `whisper`, `connected`, etc.

**6. Rate Limiting:**
- `Queue.js` provides sequential execution with delays
- Used for joining channels on connect to avoid Twitch rate limits
- Each queue item has optional custom delay or uses default

### Important Files to Know

**ClientBase.js (1300+ lines):**
- Contains the majority of the implementation
- `handleMessage()` is the main message dispatcher (lines 76-1113)
- Handles PING/PONG, JOIN/PART, PRIVMSG, NOTICE, ROOMSTATE, etc.
- Connection logic starts at line 1114 (`connect()` method)
- Message sending logic: `_sendCommand()` and `_sendMessage()`

**Client.js:**
- Thin wrapper that adds command methods
- Each method corresponds to a Twitch chat command
- Many methods have aliases (e.g., `leave` = `part`, `slowmode` = `slow`)
- Special handling for `say()` - detects if message is a command or action

**parser.js:**
- `msg(data)` - Main IRC message parser (line 120)
- Parses IRCv3 tags, prefix, command, and parameters
- Helper functions for badges, badge-info, and emotes

**utils.js:**
- Channel/username normalization (adds/removes `#` prefix)
- IRC escape/unescape for message tags
- Token and password handling
- `justinfan` username generation for anonymous users

### Browser vs Node.js

The library works in both environments:
- **Node.js**: Uses `ws` package for WebSocket
- **Browser**: Uses native `WebSocket` API, `ws` is shimmed to false in package.json
- Detection: `const _WebSocket = _global.WebSocket ?? require('ws');` (ClientBase.js:4)

## Testing

Test files in `test/`:
- `commands.js` - Tests for all command methods (ban, timeout, say, etc.)
- `events.js` - Tests for event emission
- `authentication.js` - Login and authentication tests
- `websockets.js` - WebSocket connection tests
- `client.js` - Client initialization tests
- `logger.js` - Logger tests
- `invalid.js` - Error handling tests

Tests use Mocha + should assertion library + hook-std for capturing output.

## Contributing / Commit Format

When making commits, follow the format defined in CONTRIBUTING.md:
- Format: `<scope>: subject` (all lowercase)
- Scope = filename without extension
- Examples:
  - `client: add support for new command`
  - `utils: fix channel name normalization`
  - `parser: improve emote parsing`

## Notes for TypeScript Migration

Since the goal is to port to native TypeScript:
- Type definitions already exist in `types.d.ts`
- Key types: `Client`, `Options`, `ChatUserstate`, `SubGiftUserstate`, etc.
- The architecture is already modular with clear separation of concerns
- Consider keeping the same class hierarchy: `Client extends ClientBase extends EventEmitter`
- Watch out for the custom EventEmitter - may want to use Node's native one in TS version
- The IRC parser in `parser.js` has a specific license (BSD) - note at top of file
