# Session hooks

## `session-start.sh` — claude-mem bootstrap

Installs and starts [claude-mem](https://github.com/thedotmack/claude-mem) (persistent
memory for Claude Code) at the start of every **Claude Code on the web** session.

### Why this exists

On a developer machine claude-mem installs once at user scope (`~/.claude`) and
covers every project automatically — there is nothing per-repo to configure.

Claude Code on the web is different: each session gets a **fresh, ephemeral
container**. `~/.claude` and `~/.claude-mem` are rebuilt from scratch every time,
so the user-scope install is absent on every start. This hook redoes it.

The hook is a no-op on local machines — it exits immediately unless
`CLAUDE_CODE_REMOTE=true`.

### Cloud sync — required for memory to actually persist

Installing claude-mem in an ephemeral container gives you a memory database that
is **destroyed with the container**. Memory that resets every session is not
memory. Cloud sync is what carries observations across containers, and it needs
two things:

**1. Allowlist `cmem.ai` in the environment's network egress policy.**

This is the current blocker. The environment denies it today:

```
$ curl https://cmem.ai
curl: (56) CONNECT tunnel failed, response 403
```

The proxy reports `connect_rejected — gateway answered 403 to CONNECT (policy
denial)` for `cmem.ai:443`. Until the host is allowlisted, sync cannot work no
matter how it is configured. Egress policy is set per environment — see
https://code.claude.com/docs/en/claude-code-on-the-web.

**2. Set the API key as an environment variable on the environment.**

| Variable | Required | Purpose |
|---|---|---|
| `CLAUDE_MEM_SERVER_API_KEY` | yes | cmem.ai API key (`cmem_...`). Enables sync. |
| `CLAUDE_MEM_SERVER_PROJECT_ID` | no | Groups memories under one project. |
| `CLAUDE_MEM_SERVER_URL` | no | Override the sync endpoint. |
| `CLAUDE_MEM_VERSION` | no | Pin a different claude-mem version. |
| `CLAUDE_MEM_SYNC_HOST` | no | Override the reachability-check host. |

The key is written to `~/.claude-mem/settings.json` with mode `0600`. It is read
from the environment only — never commit it to this repo.

With no key set, the hook still installs claude-mem and logs
`cloud sync OFF — memory will be session-scoped only`.

### Behavior

Every failure path logs and exits `0`. A registry outage or a broken install can
slow a session start but can never block it.

| Condition | Result |
|---|---|
| Not a web session | Exits immediately, does nothing |
| `npx` missing | Logs and exits |
| Already installed | Skips reinstall (~1s) |
| Install fails | Logs, continues without memory |
| Key set, host unreachable | Logs remediation, continues without sync |
| Key set, host reachable | Writes sync config, starts worker |

### Checking it worked

```bash
cat "${TMPDIR:-/tmp}/claude-mem-bootstrap.log"
npx claude-mem status
```

### Cost and the async trade-off

A cold install measures **~65s**, and web containers are always cold — the ~1s
warm path only applies to resume/clear/compact within a live session. The hook
runs **synchronously**, so that time is added to session start.

To trade that for a faster start, make the first line of the script emit:

```bash
echo '{"async": true, "asyncTimeout": 300000}'
```

Async starts the session immediately and installs in the background, at the cost
of a race: early turns may run before memory is available.
