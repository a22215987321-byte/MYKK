/** Static resources must be JSON: the host's SPA fallback can return HTML with HTTP 200. */
export async function fetchLibraryJson(url: string, signal?: AbortSignal): Promise<unknown[]> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 15000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Library request failed (${response.status})`)
    const data = await response.json()
    if (!Array.isArray(data) || !data.length) throw new Error('Library resource is empty or invalid')
    return data
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export function validateLibraryCatalog(data: unknown[]): boolean {
  const ids = new Set<string>()
  return data.every((item: any) => {
    if (!item || item.id == null || typeof item.name !== 'string' || !item.name.trim() ||
        typeof item.url !== 'string' || !item.url || typeof item.enName !== 'string' ||
        typeof item.category !== 'string' || !Array.isArray(item.tags) ||
        !Number.isInteger(item.length) || item.length < 1 || ids.has(String(item.id))) return false
    ids.add(String(item.id))
    return true
  })
}
