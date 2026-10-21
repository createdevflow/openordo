export function getFileUrl(idOrUrl: string | null | undefined): string {
  if (!idOrUrl) return "";
  if (
    idOrUrl.startsWith("http://") ||
    idOrUrl.startsWith("https://") ||
    idOrUrl.startsWith("data:")
  ) {
    return idOrUrl;
  }
  if (idOrUrl.startsWith("/api/files/")) {
    return idOrUrl;
  }
  const clean = idOrUrl.replace(/^\/?(uploads\/)?/, "");
  return `/api/files/${clean}`;
}
