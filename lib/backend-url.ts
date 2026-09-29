export const DEFAULT_ACCORD_API_URL = 'https://accord.codewithseth.co.ke'

export function accordApiUrl() {
  return (
    process.env.ACCORD_API_URL
    || process.env.NEXT_PUBLIC_ACCORD_API_URL
    || DEFAULT_ACCORD_API_URL
  ).replace(/\/$/, '')
}

export function accordApiPath(path: string) {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${accordApiUrl()}${suffix}`
}
