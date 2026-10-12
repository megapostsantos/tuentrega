// Compatibility shim — replaced by Better Auth
// Better Auth handles session cookies automatically; no bearer token attachment needed.
import { createMiddleware } from "@tanstack/react-start";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // Better Auth uses cookies; no manual header injection needed.
    return next({ headers: {} });
  },
);
