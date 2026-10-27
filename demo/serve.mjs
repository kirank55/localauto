import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT ?? 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
  const requested = decodeURIComponent(url.pathname)
  if (requested === '/favicon.ico') {
    response.writeHead(204)
    response.end()
    return
  }
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')
  const path = normalize(join(root, relative))
  if (!path.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }
  try {
    const body = await readFile(path)
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'text/plain; charset=utf-8' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Localauto demo at http://127.0.0.1:${port}`)
})
