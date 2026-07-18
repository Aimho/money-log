export function buildAuthRedirect(location: Pick<Location, "origin" | "pathname">) {
  return `${location.origin}${location.pathname}`;
}
