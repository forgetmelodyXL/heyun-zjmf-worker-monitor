# Cloudflare Worker ZJMF Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Python ZJMF server monitor into a Cloudflare Worker that runs by Cron Triggers, stores state in D1, and exposes protected admin APIs.

**Architecture:** Keep the original Python script as reference and add a new `cloudflare-worker/` app. Runtime state, providers, servers, settings, and notification channels live in D1. Worker `scheduled()` performs checks; `fetch()` exposes admin and status APIs guarded by `ADMIN_TOKEN`.

**Tech Stack:** Cloudflare Workers modules, D1, Wrangler, plain ESM JavaScript, Node built-in `node:test`.

---

## File Structure

- Create `cloudflare-worker/package.json`: scripts for test and Wrangler deploy.
- Create `cloudflare-worker/wrangler.toml`: Worker entry, Cron Trigger, D1 binding placeholder.
- Create `cloudflare-worker/migrations/0001_init.sql`: D1 schema and default settings.
- Create `cloudflare-worker/src/constants.js`: state names, transitions, defaults.
- Create `cloudflare-worker/src/time.js`: epoch/timezone helpers.
- Create `cloudflare-worker/src/state-machine.js`: pure state transition and reboot decision logic.
- Create `cloudflare-worker/src/zjmf-client.js`: fetch-based ZJMF API client.
- Create `cloudflare-worker/src/notifier.js`: webhook/pushplus-compatible notification sender.
- Create `cloudflare-worker/src/repository.js`: D1 reads/writes.
- Create `cloudflare-worker/src/monitor.js`: one monitor run orchestration.
- Create `cloudflare-worker/src/routes.js`: admin and public HTTP API routing.
- Create `cloudflare-worker/src/index.js`: Worker entrypoint.
- Create `cloudflare-worker/test/*.test.js`: tests for pure behavior before implementation.
- Create `cloudflare-worker/README.md`: deployment and API usage guide.

## Task 1: Worker Scaffold

**Files:**
- Create: `cloudflare-worker/package.json`
- Create: `cloudflare-worker/wrangler.toml`
- Create: `cloudflare-worker/src/constants.js`
- Create: `cloudflare-worker/migrations/0001_init.sql`

- [ ] Write package/wrangler/schema files.
- [ ] Run: `npm test`
- [ ] Expected: test runner reports zero tests or passes existing tests.

## Task 2: State Machine TDD

**Files:**
- Create: `cloudflare-worker/test/state-machine.test.js`
- Create: `cloudflare-worker/src/state-machine.js`
- Modify: `cloudflare-worker/src/constants.js`

- [ ] Write failing tests for `healthy -> suspect -> down -> rebooting -> recovering -> healthy`.
- [ ] Run: `npm test -- state-machine`
- [ ] Expected: FAIL because exports are missing.
- [ ] Implement minimal pure state functions.
- [ ] Run: `npm test -- state-machine`
- [ ] Expected: PASS.

## Task 3: ZJMF Client TDD

**Files:**
- Create: `cloudflare-worker/test/zjmf-client.test.js`
- Create: `cloudflare-worker/src/zjmf-client.js`

- [ ] Write failing tests for login query-string auth, JWT extraction, status extraction, and hard reboot.
- [ ] Run: `npm test -- zjmf-client`
- [ ] Expected: FAIL because client is missing.
- [ ] Implement fetch-based client with one auth retry.
- [ ] Run: `npm test -- zjmf-client`
- [ ] Expected: PASS.

## Task 4: Notification TDD

**Files:**
- Create: `cloudflare-worker/test/notifier.test.js`
- Create: `cloudflare-worker/src/notifier.js`

- [ ] Write failing tests for custom webhook and pushplus JSON body.
- [ ] Run: `npm test -- notifier`
- [ ] Expected: FAIL because notifier is missing.
- [ ] Implement webhook dispatch and template replacement.
- [ ] Run: `npm test -- notifier`
- [ ] Expected: PASS.

## Task 5: D1 Repository and Monitor Wiring

**Files:**
- Create: `cloudflare-worker/src/repository.js`
- Create: `cloudflare-worker/src/monitor.js`
- Create: `cloudflare-worker/test/monitor.test.js`

- [ ] Write failing tests with a small fake repository.
- [ ] Implement monitor orchestration: load config, check health, save runtime, reboot, notify.
- [ ] Run: `npm test`
- [ ] Expected: PASS.

## Task 6: HTTP API and Documentation

**Files:**
- Create: `cloudflare-worker/src/routes.js`
- Create: `cloudflare-worker/src/index.js`
- Create: `cloudflare-worker/README.md`

- [ ] Add protected admin endpoints and public status endpoint.
- [ ] Document D1 creation, migration, secrets, deployment, and API examples.
- [ ] Run: `npm test`
- [ ] Expected: PASS.

## Worker Limitation

Cloudflare Workers cannot run local ICMP `ping`, so the Worker version implements `api_only` monitoring first. Existing `ping_only`, `ping_then_api`, and `api_then_ping` configurations should be treated as unsupported unless replaced with an HTTP-based probe in a later task.
