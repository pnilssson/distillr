const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalhostHostname(hostname: string): boolean {
  return LOCALHOST_HOSTNAMES.has(hostname.toLowerCase());
}

export function isLocalhostUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    return isLocalhostHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}
