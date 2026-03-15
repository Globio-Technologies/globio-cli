# @globio/cli

The official CLI for [Globio](https://globio.stanlink.online) —
game backend as a service built on Cloudflare Workers.

## Requirements

- Node.js 18+
- A Globio account — [console.globio.stanlink.online](https://console.globio.stanlink.online)

## Install

```bash
# Run without installing
npx @globio/cli <command>

# Or install globally
npm install -g @globio/cli
```

## Quick Start

```bash
# Log in to your Globio account
globio login

# Initialize a new project
globio init

# Or non-interactively
globio init --name "My Game" --org org_xxx --json
```

---

## Authentication

Globio CLI authenticates at account level using a Personal
Access Token (PAT). Two login methods are supported.

**Browser flow** — opens the Globio console for one-click approval:
```bash
globio login
```

**Token flow** — paste a PAT from console settings:
```bash
globio login --token glo_pat_xxxxx
```

**Named profiles** — manage multiple accounts:
```bash
globio login --profile work
globio login --profile personal
globio use work
```

Credentials are stored in `~/.globio/profiles/`

---

## Commands

### Auth

```bash
globio login                        # browser or token flow
globio login --token <pat>          # non-interactive
globio login --profile <name>       # named profile
globio logout
globio logout --profile <name>
globio whoami
globio whoami --json
```

### Profiles

```bash
globio profiles list
globio profiles list --json
globio use <profile>                # switch active profile
```

### Projects

```bash
globio projects list
globio projects list --json
globio projects use <projectId>
globio projects create              # interactive
globio projects create \
  --name "My Game" \
  --org <orgId> \
  --json                            # non-interactive
```

### Services

```bash
globio services list
globio services list --json
```

### Edge Functions (GlobalCode)

```bash
globio functions list
globio functions list --json
globio functions create <slug>      # scaffold locally
globio functions deploy <slug>      # deploy to Globio
globio functions invoke <slug> --input '{"key":"value"}'
globio functions invoke <slug> --input '{"key":"value"}' --json
globio functions logs <slug>
globio functions logs <slug> --json
globio functions watch <slug>       # live log streaming
globio functions enable <slug>
globio functions disable <slug>
globio functions delete <slug>
```

### GC Hooks

GC Hooks fire automatically when events occur in your
Globio project. They cannot be invoked manually.

```bash
globio hooks list
globio hooks list --json
globio hooks create <slug>          # scaffold locally
globio hooks deploy <slug> \
  --trigger id.onSignup             # deploy with trigger
globio hooks logs <slug>
globio hooks watch <slug>           # live log streaming
globio hooks enable <slug>
globio hooks disable <slug>
globio hooks delete <slug>
```

**Available hook triggers:**

| Trigger | Fires when |
|---|---|
| `id.onSignup` | New user registers |
| `id.onSignin` | User signs in |
| `id.onSignout` | User signs out |
| `id.onPasswordReset` | Password reset completed |
| `doc.onCreate` | Document created |
| `doc.onUpdate` | Document updated |
| `doc.onDelete` | Document deleted |
| `mart.onPurchase` | In-game currency purchase |
| `mart.onPayment` | Fiat payment completed |
| `sync.onRoomCreate` | Game room created |
| `sync.onRoomClose` | Game room closed |
| `sync.onPlayerJoin` | Player joins a room |
| `sync.onPlayerLeave` | Player leaves a room |
| `vault.onUpload` | File uploaded |
| `vault.onDelete` | File deleted |
| `signal.onDeliver` | Notification delivered |

**Example hook:**
```javascript
// init-player.hook.js
async function handler({ userId, email }, globio) {
  await globio.doc.set('players', userId, {
    level: 1, xp: 0, coins: 100
  });
  await globio.signal.sendToUser(userId, {
    title: 'Welcome!',
    body: 'Your adventure begins.',
    priority: 'high'
  });
}
```

```bash
globio hooks deploy init-player --trigger id.onSignup
```

### Migrate from Firebase

Migrate Firestore collections and Firebase Storage
to Globio in one command. Non-destructive — your
Firebase data stays intact until you delete it manually.

GlobalDoc indexes are created automatically for every
field during migration. Queries work immediately after.

```bash
# Migrate a single Firestore collection
globio migrate firestore \
  --from ./serviceAccountKey.json \
  --collection players

# Migrate all Firestore collections
globio migrate firestore \
  --from ./serviceAccountKey.json \
  --all

# Migrate Firebase Storage
globio migrate firebase-storage \
  --from ./serviceAccountKey.json \
  --bucket gs://my-game.appspot.com \
  --all

# Migrate a specific folder
globio migrate firebase-storage \
  --from ./serviceAccountKey.json \
  --bucket gs://my-game.appspot.com \
  --folder /avatars
```

---

## JSON Output and CI/CD

Every command supports `--json` for machine-readable output.
Use this in CI/CD pipelines, scripts, and AI agents.

```bash
globio whoami --json
globio projects list --json
globio functions list --json
globio functions invoke <slug> --input '{}' --json
globio hooks list --json
globio services list --json
```

Combined with non-interactive flags for full automation:

```bash
# Full CI/CD setup — no prompts
globio login --token $GLOBIO_PAT --profile ci --json
globio projects create \
  --name "My Game" \
  --org $ORG_ID \
  --json
globio functions deploy my-function --json
```

---

## Live Log Streaming

Stream real-time function and hook execution logs
to your terminal — including console.log output,
inputs, results, and errors.

```bash
globio functions watch matchmaking
globio hooks watch init-player
```

Example output:
```
  ⇒⇒ globio 1.0.0
  ──────────────────────────────────────────
  watching matchmaking · press Ctrl+C to stop

  ● connected — waiting for invocations...

  ✓ 2026-03-15 06:12:01  [http]  3ms
      input    {"userId":"player_001","rating":1450}
      log      Querying players with rating 1450
      log      Found 3 candidates
      result   {"matched":true,"roomId":"room_abc"}
```

---

## globio.config.ts

Running `globio init` creates a `globio.config.ts` in
your project root with your project already configured:

```typescript
import { Globio } from '@globio/sdk';

export const globio = new Globio({
  apiKey: process.env.GLOBIO_API_KEY!,
  projectId: 'proj_xxxxx',
});
```

Import it anywhere in your project:

```typescript
import { globio } from './globio.config';

const player = await globio.doc.get('players', userId);
```

---

## Links

- [SDK](https://npmjs.com/package/@globio/sdk) — `@globio/sdk`
- [Console](https://console.globio.stanlink.online)
- [Docs](https://docs.globio.stanl.ink)
- [Discord](https://discord.gg/bNDvAsVkMY)
- [GitHub](https://github.com/Globio-Technologies/globio-cli)
