import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const rawRequest: Request = (event as any).req;
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
      const { db } = await import("./db");
      const { users, accounts, sessions } = await import("./db/schema");
      const { eq } = await import("drizzle-orm");
      const email = "lgramirodecampos@gmail.com";

      // Hard delete everything for this email
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      for (const u of existing) {
        await db.delete(sessions).where(eq(sessions.userId, u.id));
        await db.delete(accounts).where(eq(accounts.userId, u.id));
      }
      await db.delete(users).where(eq(users.email, email));

      // Use Better Auth's own sign-up endpoint to create user with correct hash
      const signUpReq = new Request(new URL("/api/auth/sign-up/email", url.origin).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": url.origin },
        body: JSON.stringify({ email, password: "123456", name: "Admin Master" }),
      });
      const { auth } = await import("./lib/auth");
      const signUpRes = await auth.handler(signUpReq);
      const signUpBody = await signUpRes.json() as any;

      if (signUpRes.status !== 200) {
        return Response.json({ error: "sign-up failed", status: signUpRes.status, body: signUpBody });
      }

      // Update role to admin
      await db.update(users).set({ role: "admin" }).where(eq(users.email, email));

      return Response.json({ ok: true, email, userId: signUpBody.user?.id });
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
  return response;
});
