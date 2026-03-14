# @globio/cli

The official CLI for [Globio](https://globio.stanlink.online)
— game backend as a service built on Cloudflare Workers.

## Install

```bash
# Run without installing
npx @globio/cli <command>

# Or install globally
npm install -g @globio/cli
```

## Quick Start

```bash
npx @globio/cli login
npx @globio/cli init
```

## Migrate from Firebase

```bash
# Migrate all Firestore collections to GlobalDoc
npx @globio/cli migrate firestore \
  --from ./serviceAccountKey.json \
  --all

# Migrate Firebase Storage to GlobalVault
npx @globio/cli migrate firebase-storage \
  --from ./serviceAccountKey.json \
  --bucket gs://my-game.appspot.com \
  --all
```

## Commands

### Auth
```bash
globio login       # authenticate
globio logout
globio whoami      # show active account and project
```

### Projects
```bash
globio projects list
globio projects use <projectId>
```

### Services
```bash
globio services list
```

### Functions (GlobalCode)
```bash
globio functions list
globio functions create <slug>     # scaffold locally
globio functions deploy <slug>     # deploy to Globio
globio functions invoke <slug> --input '{"key":"value"}'
globio functions logs <slug>
globio functions enable <slug>
globio functions disable <slug>
globio functions delete <slug>
```

### Migrate from Firebase
```bash
globio migrate firestore \
  --from ./serviceAccountKey.json \
  --collection players

globio migrate firestore \
  --from ./serviceAccountKey.json \
  --all

globio migrate firebase-storage \
  --from ./serviceAccountKey.json \
  --bucket gs://my-game.appspot.com \
  --all
```

## Built with Globio

- [SDK](https://npmjs.com/package/@globio/sdk)
- [Console](https://console.globio.stanlink.online)
- [Docs](https://globio.stanlink.online/docs)
