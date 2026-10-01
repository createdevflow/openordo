export function getFileUrl(idOrUrl: string | null | undefined): string {
  if (!idOrUrl) return "";
  if (idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://") || idOrUrl.startsWith("data:") || idOrUrl.startsWith("/api/files/")) {
    return idOrUrl;
  }
  return `/api/files/${idOrUrl}`;
}
