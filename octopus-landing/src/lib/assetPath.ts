export function withBasePath(path: string, baseUrl: string) {
  const normalizedBase = baseUrl === '/' ? '/' : `/${baseUrl.replace(/^\/+|\/+$/gu, '')}/`;
  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
}

export function assetPath(path: string) {
  return withBasePath(path, import.meta.env.BASE_URL);
}
