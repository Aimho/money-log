export function buildMagicLinkRedirect(location: Pick<Location, "origin" | "pathname" | "search">) {
  return `${location.origin}${location.pathname}${location.search}`;
}
