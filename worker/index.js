/**
 * dashboard.callinix.com gateway:
 * - Public → under-construction static assets
 * - Testers (preview secret, cookie, or IP) → real app at APP_ORIGIN
 */

const PREVIEW_COOKIE =
  'callinix_tester=1; Domain=.callinix.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'

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

function previewMatches(url, env) {
  const token = url.searchParams.get('preview')?.trim()
  const secret = env.PREVIEW_SECRET?.trim()
  return Boolean(token && secret && token === secret)
}

function buildOriginUrl(request, env) {
  const incoming = new URL(request.url)
  const origin = new URL(env.APP_ORIGIN)
  incoming.hostname = origin.hostname
  incoming.protocol = origin.protocol
  incoming.port = origin.port
  incoming.searchParams.delete('preview')
  return incoming
}

function proxyToApp(request, env) {
  const target = buildOriginUrl(request, env)
  const origin = new URL(env.APP_ORIGIN)
  const headers = new Headers(request.headers)

  // Required: wrong Host makes app.callinix.com mis-route or hit redirect rules
  headers.set('Host', origin.host)
  headers.set('X-Forwarded-Host', new URL(request.url).host)
  headers.set(
    'X-Forwarded-Proto',
    new URL(request.url).protocol.replace(':', ''),
  )

  if (env.PROXY_HEADER_SECRET) {
    headers.set('X-Callinx-Proxy', env.PROXY_HEADER_SECRET)
  }

  return fetch(
    new Request(target.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    }),
  )
}

async function proxyWithPreviewCookie(request, env) {
  const response = await proxyToApp(request, env)
  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', PREVIEW_COOKIE)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function redirectWithPreviewCookie(url) {
  const target = new URL(url)
  target.searchParams.delete('preview')
  const headers = new Headers()
  headers.set('Set-Cookie', PREVIEW_COOKIE)
  headers.set('Location', target.toString())
  return new Response(null, { status: 302, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // GET /__callinx-health — verify bindings after deploy (no secret values exposed)
    if (url.pathname === '/__callinx-health') {
      return Response.json({
        hasAppOrigin: Boolean(env.APP_ORIGIN),
        hasPreviewSecret: Boolean(env.PREVIEW_SECRET),
        hasProxyHeaderSecret: Boolean(env.PROXY_HEADER_SECRET),
        appOrigin: env.APP_ORIGIN || null,
      })
    }

    // ?preview= in URL — never fall through to under-construction silently
    if (url.searchParams.has('preview')) {
      if (!env.PREVIEW_SECRET?.trim()) {
        return new Response(
          'Preview gateway: PREVIEW_SECRET is not set. Add it as an encrypted Secret in Cloudflare (plain text variables are removed on every Git deploy).',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        )
      }
      if (!previewMatches(url, env)) {
        return new Response('Preview gateway: invalid preview token.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      if (!env.APP_ORIGIN) {
        return new Response('Preview gateway: APP_ORIGIN is not configured.', {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      if (!env.PROXY_HEADER_SECRET?.trim()) {
        return new Response(
          'Preview gateway: PROXY_HEADER_SECRET is not set. Add it as an encrypted Secret (must match the app→dashboard redirect rule).',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        )
      }
      // Origin down (no app deployed yet) → browser shows 502/522 from Cloudflare
      return proxyWithPreviewCookie(request, env)
    }

    if (!env.APP_ORIGIN) {
      if (isTester(request, env)) {
        return new Response('APP_ORIGIN is not configured', { status: 500 })
      }
      return env.ASSETS.fetch(request)
    }

    if (isTester(request, env)) {
      return proxyToApp(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
