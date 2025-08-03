import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'
import next from 'next'
import { start } from '@opencode-ai/sdk'
import { POST as postWorkspace, GET as getWorkspaces } from '@/app/api/workspaces/route'
import { POST as postSession, GET as getSessions } from '@/app/api/workspaces/[workspaceId]/sessions/route'
import { GET as getSession, DELETE as deleteSession } from '@/app/api/workspaces/[workspaceId]/sessions/[sessionId]/route'
import { POST as postChat, GET as getChat } from '@/app/api/workspaces/[workspaceId]/sessions/[sessionId]/chat/route'

// Helper to parse request body
async function parseJSON(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch (e) {
        reject(e)
      }
    })
  })
}

// Mock NextRequest for our handlers
function createMockRequest(req: IncomingMessage, body: any) {
  return {
    ...req,
    json: async () => body,
  } as any
}

export function createTestServer() {
  const app = next({ dev: true, quiet: true, dir: '.' })
  const handle = app.getRequestHandler()

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url!, true)
    const { pathname } = parsedUrl

    try {
      const body = await parseJSON(req)
      const mockReq = createMockRequest(req, body)

      if (pathname === '/api/workspaces' && req.method === 'POST') {
        const response = await postWorkspace(mockReq)
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname === '/api/workspaces' && req.method === 'GET') {
        const response = await getWorkspaces()
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions$/) && req.method === 'POST') {
        const workspaceId = pathname.split('/')[3]
        const response = await postSession(mockReq, { params: { workspaceId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions$/) && req.method === 'GET') {
        const workspaceId = pathname.split('/')[3]
        const response = await getSessions(mockReq, { params: { workspaceId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions\/[^/]+$/) && req.method === 'GET') {
        const [, , , workspaceId, , sessionId] = pathname.split('/')
        const response = await getSession(mockReq, { params: { workspaceId, sessionId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions\/[^/]+$/) && req.method === 'DELETE') {
        const [, , , workspaceId, , sessionId] = pathname.split('/')
        const response = await deleteSession(mockReq, { params: { workspaceId, sessionId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions\/[^/]+\/chat$/) && req.method === 'POST') {
        const [, , , workspaceId, , sessionId] = pathname.split('/')
        const response = await postChat(mockReq, { params: { workspaceId, sessionId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else if (pathname?.match(/^\/api\/workspaces\/[^/]+\/sessions\/[^/]+\/chat$/) && req.method === 'GET') {
        const [, , , workspaceId, , sessionId] = pathname.split('/')
        const response = await getChat(mockReq, { params: { workspaceId, sessionId } })
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      } else {
        await handle(req, res, parsedUrl)
      }
    } catch (error) {
      console.error('Request handling error:', error)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    }
  })

  return server
}

// Start the OpenCode server
start({ port: 0 })
