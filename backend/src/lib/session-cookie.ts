import type { NextRequest } from "next/server";

/**
 * Determine whether the browser-facing request used HTTPS. Forwarded protocol
 * headers are ignored unless the deployment explicitly sits behind a trusted
 * proxy that overwrites X-Forwarded-Proto.
 */
export function shouldUseSecureSessionCookie(request: NextRequest): boolean {
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.trim()
      .toLowerCase();

    if (forwardedProto === "https" || forwardedProto === "http") {
      return forwardedProto === "https";
    }
  }

  return request.nextUrl.protocol === "https:";
}
