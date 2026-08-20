# Eodly MCP server

Read your team's sourced end-of-day reports and roster from any MCP client, using an Eodly API key.

[Eodly](https://eodly.io) sends founders and team leads one sourced report every evening: who shipped, who is silent, who is slipping. Your team checks in from Slack, Telegram, Microsoft Teams, or Discord, and Eodly weighs each claim against the real work in GitHub and Linear. This server exposes those reports to MCP clients such as Claude and Cursor, so you can ask an agent "who is slipping this week?" and have it pull the sourced answer.

Read-only. It cannot change anything in your workspace.

## Install

### Hosted (recommended)

A remote Streamable HTTP endpoint, nothing to install:

```
https://eodly.io/api/mcp
```

### Local (stdio)

```bash
npx @eodly/mcp
```

## Configure

Create an API key in the Eodly app under **Settings → Developer → API keys**, then add the server to your client.

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
| `whoami` | Identify the key: which organization it belongs to and what scopes it holds | none |
| `list_reports` | Recent end-of-day report summaries, most recent first (`limit`, 1-50, default 14) | `reports:read` |
| `get_report` | Full structured content of one report by id | `reports:read` |
| `list_team` | The team roster: names, roles, departments | `team:read` |

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
