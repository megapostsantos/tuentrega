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
      const { users, accounts, sessions } = await import("./db/schema");
      const { eq } = await import("drizzle-orm");
      const email = "lgramirodecampos@gmail.com";
      const ctx = await (auth as any).$context;

      // Hard delete everything for this email to start clean
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      for (const u of existing) {
        await db.delete(sessions).where(eq(sessions.userId, u.id));
        await db.delete(accounts).where(eq(accounts.userId, u.id));
      }
      await db.delete(users).where(eq(users.email, email));

      // Create fresh user + account via Better Auth internals (correct hash)
      const passwordHash = await ctx.password.hash("123456");
      const newUser = await ctx.internalAdapter.createUser({
        email, name: "Admin Master", emailVerified: true, role: "admin",
      });
      await ctx.internalAdapter.linkAccount({
        userId: newUser.id, providerId: "credential",
        accountId: email, password: passwordHash,
      });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, newUser.id));

      return Response.json({ ok: true, email, id: newUser.id, passwordHashPreview: passwordHash.substring(0, 30) });
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "unknown", stack: (e as any)?.stack?.split("\n")[0] }, { status: 500 });
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
