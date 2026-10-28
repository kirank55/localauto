/** Match patterns duplicated in the manifest via this list. Keep them narrow. */
export const HOST_MATCHES = [
  'https://boards.greenhouse.io/*',
  'https://job-boards.greenhouse.io/*',
  'https://jobs.lever.co/*',
  'http://localhost/*',
  'http://127.0.0.1/*',
] as const

export type HostKey = 'greenhouse' | 'lever' | 'demo'

export function classifyHost(hostname: string): HostKey | null {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host === '127.0.0.1') return 'demo'
  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') return 'greenhouse'
  if (host === 'jobs.lever.co') return 'lever'
  return null
}

export function hostLabel(host: HostKey): string {
  switch (host) {
    case 'greenhouse':
      return 'Greenhouse'
    case 'lever':
      return 'Lever'
    case 'demo':
      return 'Local demo'
  }
}
