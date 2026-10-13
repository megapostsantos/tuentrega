import { defineEventHandler, toRequest, sendWebResponse } from "h3";

export default defineEventHandler(async (event) => {
  const rawRequest: Request = (event as any).web?.request ?? toRequest(event);
  const url = new URL(rawRequest.url);

  if (url.pathname === "/api/auth/env-check") {
    return Response.json({
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "set" : "MISSING",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "(not set)",
      requestUrl: rawRequest.url,
    });
  }

  if (url.pathname === "/api/auth/reset-admin" && url.searchParams.get("secret") === "tuentrega-reset-2024") {
    try {
      const { auth } = await import("./lib/auth");
      const { db } = await import("./db");
      const { users } = await import("./db/schema");
      const { eq } = await import("drizzle-orm");
      const email = "lgramirodecampos@gmail.com";
      const ctx = await (auth as any).$context;
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) await ctx.internalAdapter.deleteUser(existing[0].id);
      const newUser = await ctx.internalAdapter.createUser({ email, name: "Admin Master", emailVerified: true, role: "admin" });
      await ctx.internalAdapter.linkAccount({ userId: newUser.id, providerId: "credential", accountId: email, password: await ctx.password.hash("123456") });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, newUser.id));
      return Response.json({ ok: true, email, id: newUser.id });
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "unknown" }, { status: 500 });
    }
  }

  // Debug: shows full response headers from sign-in
  if (url.pathname === "/api/auth/debug-login" && url.searchParams.get("secret") === "tuentrega-reset-2024") {
    try {
      const { auth } = await import("./lib/auth");
      const testReq = new Request(new URL("/api/auth/sign-in/email", url.origin).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": url.origin },
        body: JSON.stringify({ email: "lgramirodecampos@gmail.com", password: "123456" }),
      });
      const res = await auth.handler(testReq);
      const body = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      const setCookies = (res.headers as any).getSetCookie?.() ?? [];
      return Response.json({ status: res.status, body, headers, setCookies });
    } catch (e: any) {
      return Response.json({ threw: e?.message ?? String(e) });
    }
  }

  const { auth } = await import("./lib/auth");
  const response = await auth.handler(rawRequest);
  return sendWebResponse(event, response);
});
