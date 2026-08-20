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

const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })

const server = new McpServer({ name: 'eodly', version: '0.1.2' })

server.tool(
  'whoami',
  'Identify the API key: returns the Eodly organization it belongs to and the scopes it holds.',
  {},
  async () => json(await api('/me')),
)

server.tool(
  'list_reports',
  'List recent end-of-day report summaries for the organization, most recent first. Requires the reports:read scope.',
  { limit: z.number().int().min(1).max(50).optional().describe('Max reports to return (1-50, default 14).') },
  async ({ limit }) => json(await api(`/reports${limit ? `?limit=${limit}` : ''}`)),
)

server.tool(
  'get_report',
  'Get the full structured content of a single end-of-day report by id (use list_reports to find ids). Requires the reports:read scope.',
  { id: z.string().min(1).describe('The report id (UUID).') },
  async ({ id }) => json(await api(`/reports/${encodeURIComponent(id)}`)),
)

server.tool(
  'list_team',
  'List the team roster for the organization (names, roles, departments). Requires the team:read scope.',
  {},
  async () => json(await api('/team')),
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('eodly-mcp: ready (stdio).')
