import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { auth } from "./lib/auth";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Handle all /api/auth/* requests directly (TanStack Router doesn't process these)
    if (url.pathname.startsWith("/api/auth/")) {
      // Debug endpoint
      if (url.pathname === "/api/auth/debug-login" && url.searchParams.get("secret") === "tuentrega-reset-2024") {
        try {
          const testReq = new Request(new URL("/api/auth/sign-in/email", url.origin).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Origin": url.origin },
            body: JSON.stringify({ email: "lgramirodecampos@gmail.com", password: "123456" }),
          });
          const res = await auth.handler(testReq);
          const text = await res.text();
          return Response.json({ status: res.status, body: text });
        } catch (e: any) {
          return Response.json({ threw: e?.message ?? String(e) });
        }
      }

      // Reset admin endpoint
      if (url.pathname === "/api/auth/reset-admin" && url.searchParams.get("secret") === "tuentrega-reset-2024") {
        try {
          const ctx2 = await (auth as any).$context;
          const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, "lgramirodecampos@gmail.com")).limit(1);
          if (existing.length > 0) await ctx2.internalAdapter.deleteUser(existing[0].id);
          const newUser = await ctx2.internalAdapter.createUser({ email: "lgramirodecampos@gmail.com", name: "Admin Master", emailVerified: true, role: "admin" });
          await ctx2.internalAdapter.linkAccount({ userId: newUser.id, providerId: "credential", accountId: "lgramirodecampos@gmail.com", password: await ctx2.password.hash("123456") });
          await db.update(users).set({ role: "admin" }).where(eq(users.id, newUser.id));
          return Response.json({ ok: true, email: "lgramirodecampos@gmail.com", id: newUser.id });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "unknown" }, { status: 500 });
        }
      }

      return auth.handler(request);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
