// Serves the static export for the Playwright suite.
//
// `output: 'export'` means there is no `next start` to run: the build leaves a
// folder of files and the real host is Cloudflare Pages (spec/19 §9). Twenty
// lines of node:http keep the test running against exactly what gets uploaded,
// and save a dependency whose only job would be this.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../out/', import.meta.url))
const PORT = Number(process.env.PORT ?? 3201)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

/** A path, its index.html, or its .html, as long as it stays inside out/. */
function resolveFile(url) {
  const asked = normalize(decodeURIComponent(url.split('?')[0])).replace(/^[/\\]+/, '')
  return [join(ROOT, asked), join(ROOT, asked, 'index.html'), join(ROOT, `${asked}.html`)].find(
    (path) => path.startsWith(ROOT) && existsSync(path) && statSync(path).isFile(),
  )
}

createServer((request, response) => {
  const file = resolveFile(request.url ?? '/')
  if (file) {
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
    return
  }
  // Next writes the not-found page as 404.html; serving it with a 404 status is
  // what Cloudflare Pages does too.
  const notFound = join(ROOT, '404.html')
  response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  if (existsSync(notFound)) createReadStream(notFound).pipe(response)
  else response.end()
}).listen(PORT)
