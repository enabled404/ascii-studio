// Vercel Serverless Function: ASCII Studio Model Context Protocol (MCP) Remote Endpoint
// Compatible with Claude Desktop, Cursor, Claude Code, Antigravity, and Zed over HTTP/SSE.
// Endpoint URL: https://asciipro.vercel.app/api/mcp (or https://asciipro.vercel.app/mcp)
// Engineered by Saad Khalid (@saadkhalidhere) for ASCII Studio.

import { processJsonRpcMessage, MCP_TOOLS, MCP_RESOURCES } from '../packages/mcp-server/index.js'

export default async function handler(req, res) {
  // CORS Headers for AI clients and web frontends
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id, mcp-session-id')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    const accept = req.headers?.accept || ''
    if (accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.write(`event: endpoint\ndata: https://asciipro.vercel.app/api/mcp\n\n`)
      return res.end()
    }

    return res.status(200).json({
      name: 'asciipro-mcp-server',
      version: '3.1.0',
      description: 'Production-Grade Model Context Protocol (MCP) Server for ASCII Studio',
      homepage: 'https://asciipro.vercel.app',
      endpoint: 'https://asciipro.vercel.app/api/mcp',
      toolsCount: MCP_TOOLS.length,
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: MCP_RESOURCES,
      setup: {
        claude: {
          mcpServers: {
            asciipro: {
              url: 'https://asciipro.vercel.app/api/mcp',
            },
          },
        },
        cursor: {
          mcpServers: {
            asciipro: {
              url: 'https://asciipro.vercel.app/api/mcp',
            },
          },
        },
      },
    })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (err) {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: invalid JSON' },
        })
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: expected JSON-RPC object' },
      })
    }

    try {
      const response = await processJsonRpcMessage(body)
      if (!response) {
        return res.status(204).end()
      }
      return res.status(200).json(response)
    } catch (err) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
      })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
