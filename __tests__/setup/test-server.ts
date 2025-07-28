import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import type { NextApiHandler } from 'next'

let server: any
let app: any

export async function startTestServer(): Promise<string> {
  if (server) {
    return `http://localhost:${server.address()?.port || 3000}`
  }

  const dev = process.env.NODE_ENV !== 'production'
  app = next({ dev, quiet: true })
  const handle = app.getRequestHandler()

  await app.prepare()

  server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  return new Promise((resolve, reject) => {
    server.listen(0, (err: any) => {
      if (err) {
        reject(err)
      } else {
        const port = server.address()?.port
        resolve(`http://localhost:${port}`)
      }
    })
  })
}

export async function stopTestServer(): Promise<void> {
  if (server) {
    return new Promise((resolve, reject) => {
      server.close((err: any) => {
        if (err) {
          reject(err)
        } else {
          server = null
          resolve()
        }
      })
    })
  }
  
  if (app) {
    await app.close()
    app = null
  }
}