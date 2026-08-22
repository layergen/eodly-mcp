#!/usr/bin/env node
// Eodly MCP server (stdio). A thin wrapper over the Eodly public REST API so any MCP
// client (Claude, Cursor, etc.) can read a team's end-of-day reports and roster.
//
// Config (env):
//   EODLY_API_KEY   required. An Eodly API key (eodly_sk_...). Create one in the app
//                   under Settings > Developer > API keys. See https://eodly.io/developers
//   EODLY_API_BASE  optional. Defaults to https://eodly.io/api/v1
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { REPORT_VIEW_URI, REPORT_VIEW_MIME, REPORT_VIEW_HTML } from './report-view.js'

const API_BASE = (process.env.EODLY_API_BASE ?? 'https://eodly.io/api/v1').replace(/\/$/, '')
const API_KEY = process.env.EODLY_API_KEY

if (!API_KEY) {
  console.error(
    'eodly-mcp: set EODLY_API_KEY to an Eodly API key (eodly_sk_...). Create one in the\n' +
      'Eodly app under Settings > Developer > API keys. Docs: https://eodly.io/developers',
  )
  process.exit(1)
}

async function api(path) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error(`Could not reach the Eodly API at ${API_BASE}: ${e.message}`)
  }
  const raw = await res.text()
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    body = raw
  }
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || res.statusText
    throw new Error(`Eodly API ${res.status}: ${msg}`)
  }
  return body
}

// `structuredContent` is what an MCP Apps view renders from (the report card reads it out of
// the ui/notifications/tool-result message), so every tool returns it alongside the text.
const json = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
})

// MCP Apps (ext-apps / SEP-1865): the report tools point their output at the ui:// view so a
// compliant host renders it as an interactive card. Both the nested and legacy meta keys are
// set for host compatibility. Mirrors the hosted endpoint at https://eodly.io/api/mcp.
const REPORT_UI_META = {
  ui: { resourceUri: REPORT_VIEW_URI, visibility: ['model', 'app'] },
  'ui/resourceUri': REPORT_VIEW_URI,
  // OpenAI Apps SDK convention (predates the MCP Apps standard); some hosts key on it.
  'openai/outputTemplate': REPORT_VIEW_URI,
}

const server = new McpServer(
  { name: 'eodly', title: 'Eodly', version: '0.2.0' },
  { capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [REPORT_VIEW_MIME] } } } },
)

server.registerResource(
  'eodly_report_view',
  REPORT_VIEW_URI,
  {
    description: "Interactive end-of-day report card: who shipped, who's slipping, who's silent.",
    mimeType: REPORT_VIEW_MIME,
  },
  async () => ({
    contents: [
      {
        uri: REPORT_VIEW_URI,
        mimeType: REPORT_VIEW_MIME,
        text: REPORT_VIEW_HTML,
        // The view is fully self-contained, so it needs no network access at all.
        _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] }, prefersBorder: true } },
      },
    ],
  }),
)

server.registerTool(
  'whoami',
  {
    description: 'Identify the API key: returns the Eodly organization it belongs to and the scopes it holds.',
    inputSchema: {},
  },
  async () => json(await api('/me')),
)

server.registerTool(
  'list_reports',
  {
    description:
      'List recent end-of-day report summaries for the organization, most recent first. Requires the reports:read scope.',
    inputSchema: {
      limit: z.number().int().min(1).max(50).optional().describe('Max reports to return (1-50, default 14).'),
    },
    _meta: REPORT_UI_META,
  },
  async ({ limit }) => json(await api(`/reports${limit ? `?limit=${limit}` : ''}`)),
)

server.registerTool(
  'get_report',
  {
    description:
      'Get the full structured content of a single end-of-day report by id (use list_reports to find ids). Requires the reports:read scope.',
    inputSchema: { id: z.string().min(1).describe('The report id (UUID).') },
    _meta: REPORT_UI_META,
  },
  async ({ id }) => json(await api(`/reports/${encodeURIComponent(id)}`)),
)

server.registerTool(
  'list_team',
  {
    description: 'List the team roster for the organization (names, roles, departments). Requires the team:read scope.',
    inputSchema: {},
  },
  async () => json(await api('/team')),
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('eodly-mcp: ready (stdio).')
