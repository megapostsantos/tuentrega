// Compatibility shim — replaced by Better Auth
// Server functions should use auth.api.getSession() from @/lib/auth
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    // With Better Auth, session validation is done via cookie.
    // This shim passes through — actual auth should use auth.api.getSession().
    return next({
      context: {
        userId: null,
        claims: null,
      },
    });
  },
);
