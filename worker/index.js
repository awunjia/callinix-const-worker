/**
 * Routes callinix.com:
 * - Everyone else → under-construction static assets
 * - Testers (cookie, IP allowlist, or ?preview=SECRET) → real app origin
 */

function parseCookie(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key) out[key] = rest.join('=')
  }
  return out
}

function isTester(request, env) {
  const cookies = parseCookie(request.headers.get('Cookie'))
  if (cookies.callinix_tester === '1') return true

  const ip = request.headers.get('CF-Connecting-IP')
  const allowlist = (env.TESTER_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ip && allowlist.includes(ip)) return true

  return false
}

function redirectWithPreviewCookie(url, env) {
  const target = new URL(url)
  target.searchParams.delete('preview')
  const headers = new Headers()
  headers.set(
    'Set-Cookie',
    'callinix_tester=1; Domain=.callinix.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000',
  )
  headers.set('Location', target.toString())
  return new Response(null, { status: 302, headers })
}

function proxyToApp(request, env) {
  const incoming = new URL(request.url)
  const origin = new URL(env.APP_ORIGIN)
  incoming.hostname = origin.hostname
  incoming.protocol = origin.protocol
  incoming.port = origin.port

  const headers = new Headers(request.headers)
  // Lets Cloudflare Redirect Rules skip app → dashboard for worker origin fetches
  if (env.PROXY_HEADER_SECRET) {
    headers.set('X-Callinx-Proxy', env.PROXY_HEADER_SECRET)
  }

  return fetch(
    new Request(incoming.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    }),
  )
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const preview = url.searchParams.get('preview')

    if (preview && env.PREVIEW_SECRET && preview === env.PREVIEW_SECRET) {
      return redirectWithPreviewCookie(url, env)
    }

    if (isTester(request, env)) {
      if (!env.APP_ORIGIN) {
        return new Response('APP_ORIGIN is not configured', { status: 500 })
      }
      return proxyToApp(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
