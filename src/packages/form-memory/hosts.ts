/** Match patterns duplicated in the manifest. Http and https only, so file and ftp stay out. */
export const HOST_MATCHES = ['https://*/*', 'http://*/*'] as const

export type HostKey = 'greenhouse' | 'lever' | 'demo'

const GREENHOUSE_HOSTS = new Set(['boards.greenhouse.io', 'job-boards.greenhouse.io'])
const LEVER_HOSTS = new Set(['jobs.lever.co'])
const DEMO_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function classifyHost(hostname: string): string | null {
  const host = canonicalHostname(hostname)
  if (!host) return null
  return pauseGroup(host) ?? host
}

export function isHostEnabled(enabledHosts: Record<HostKey, boolean>, hostname: string): boolean {
  const host = canonicalHostname(hostname)
  if (!host) return false
  const group = pauseGroup(host)
  if (!group) return true
  return enabledHosts[group]
}

export function hostLabel(host: string): string {
  switch (host) {
    case 'greenhouse':
      return 'Greenhouse'
    case 'lever':
      return 'Lever'
    case 'demo':
      return 'Local demo'
    default:
      return host
  }
}

function pauseGroup(host: string): HostKey | null {
  if (DEMO_HOSTS.has(host)) return 'demo'
  if (GREENHOUSE_HOSTS.has(host)) return 'greenhouse'
  if (LEVER_HOSTS.has(host)) return 'lever'
  return null
}

function canonicalHostname(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, '')
  if (!trimmed || trimmed.length > 253 || /[\s/\\#?]/.test(trimmed)) return null
  try {
    const bracketed = trimmed.includes(':') ? `[${trimmed}]` : trimmed
    const url = new URL(`http://${bracketed}/`)
    if (url.port || url.username || url.password) return null
    const host = url.hostname.replace(/\.$/, '').replace(/^\[|\]$/g, '')
    if (!host || host.length > 253) return null
    return host
  } catch {
    return null
  }
}
