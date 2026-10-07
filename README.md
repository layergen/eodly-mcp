# Eodly MCP server

Read your team's sourced end-of-day reports and roster from any MCP client. Sign in with your Eodly account, or use an Eodly API key.

**Sign in (OAuth):** `https://eodly.io/mcp` (Streamable HTTP, nothing to install, works on every Eodly plan including the free one; a founder or lead approves the connection). **With an API key:** `https://eodly.io/api/mcp` (send `Authorization: Bearer eodly_sk_...`), or locally with `npx @eodly/mcp` (stdio) and `EODLY_API_KEY` set to a key created in the app under Settings, Developer, API keys. **Tools:** `whoami`, `list_reports`, `get_report`, `list_team`. **MCP Apps:** report tools render as an interactive card in hosts that support the UI extension. Read-only, and scoped to one organization.

[Eodly](https://eodly.io) sends founders and team leads one sourced report every evening: who shipped, who is silent, who is slipping. Your team checks in from Slack, Telegram or Discord, and Eodly weighs each claim against the real work in GitHub and Linear. This server exposes those reports to MCP clients such as Claude and Cursor, so you can ask an agent "who is slipping this week?" and have it pull the sourced answer.

Read-only. It cannot change anything in your workspace.

## Install

### Sign in with Eodly (recommended)

Add a custom connector with this URL. The client opens an Eodly page where you sign in and choose **Allow**; no key to create or paste:

```
https://eodly.io/mcp
```

Works in Claude, Gemini CLI and any client that supports MCP OAuth. Remove access any time in Eodly under **Settings, Developer, Connected apps**.

### Hosted, with an API key

The same server for clients that take a header instead of a sign-in. Send the key as `Authorization: Bearer eodly_sk_...`:

```
https://eodly.io/api/mcp
```

### Local (stdio)

```bash
npx @eodly/mcp
```

## Configure

For the local server or the API-key endpoint, create an API key in the Eodly app under **Settings → Developer → API keys**, then add the server to your client.

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eodly": {
      "command": "npx",
      "args": ["-y", "@eodly/mcp"],
      "env": { "EODLY_API_KEY": "eodly_sk_..." }
    }
  }
}
```

Cursor and other MCP clients use the same shape.

## Tools

| Tool | What it does | Scope |
| --- | --- | --- |
| `whoami` | Identify the connected workspace and the scopes the connection holds | none |
| `list_reports` | Recent end-of-day report summaries, most recent first (`limit`, 1-50, default 14) | `reports:read` |
| `get_report` | Full structured content of one report by id | `reports:read` |
| `list_team` | The team roster: names, roles, departments | `team:read` |

## Interactive report card (MCP Apps)

`list_reports` and `get_report` ship an interactive view alongside their JSON. In a host that supports the MCP Apps UI extension ([SEP-1865](https://github.com/modelcontextprotocol/modelcontextprotocol)), the report renders as a card (who shipped, who's silent, who's slipping) instead of a wall of text. Hosts without the extension get the same JSON as before, so nothing breaks.

| | |
| --- | --- |
| Resource | `ui://eodly/report.html` |
| MIME type | `text/html;profile=mcp-app` |
| Capability | `io.modelcontextprotocol/ui` |

The view is fully self-contained (inline CSS and JS, no network access, no external assets) and declares an empty CSP allowlist. The hosted endpoints (`https://eodly.io/mcp` and `https://eodly.io/api/mcp`) serve the identical view.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `EODLY_API_KEY` | yes | none. An Eodly API key (`eodly_sk_...`) |
| `EODLY_API_BASE` | no | `https://eodly.io/api/v1` |

Keys are organization-scoped and read-only. Revoke one at any time in the app.

## Links

- [Eodly](https://eodly.io)
- [Developer and API documentation](https://eodly.io/developers)
- [OpenAPI specification](https://eodly.io/openapi.json)

## License

MIT. See [LICENSE](./LICENSE).
