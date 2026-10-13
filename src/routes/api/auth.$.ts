// Better Auth API route handler
// This catches all /api/auth/* requests and passes them to Better Auth
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Debug: test login and return raw response /api/auth/debug-login?secret=tuentrega-reset-2024
    if (url.pathname === "/api/auth/debug-login") {
      if (url.searchParams.get("secret") !== "tuentrega-reset-2024") {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      try {
        const testReq = new Request(new URL("/api/auth/sign-in/email", url.origin).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", "Origin": url.origin },
          body: JSON.stringify({ email: "lgramirodecampos@gmail.com", password: "123456" }),
        });
        const res = await auth.handler(testReq);
        const text = await res.text();
        return Response.json({ status: res.status, statusText: res.statusText, body: text });
      } catch (e: any) {
        return Response.json({ threw: e?.message ?? String(e) });
      }
    }

    // One-time admin reset endpoint: /api/auth/reset-admin?secret=tuentrega-reset-2024
    if (url.pathname === "/api/auth/reset-admin") {
      if (url.searchParams.get("secret") !== "tuentrega-reset-2024") {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      try {
        const email = "lgramirodecampos@gmail.com";
        const ctx = await (auth as any).$context;

        // Delete existing user
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0) {
          await ctx.internalAdapter.deleteUser(existing[0].id);
        }

        // Recreate with Better Auth (correct scrypt hash)
        const newUser = await ctx.internalAdapter.createUser({
          email,
          name: "Admin Master",
          emailVerified: true,
          role: "admin",
        });

        await ctx.internalAdapter.linkAccount({
          userId: newUser.id,
          providerId: "credential",
          accountId: email,
          password: await ctx.password.hash("123456"),
        });

        await db.update(users).set({ role: "admin" }).where(eq(users.id, newUser.id));

        return Response.json({ ok: true, email, id: newUser.id });
      } catch (e: any) {
        return Response.json({ error: e?.message ?? "unknown" }, { status: 500 });
      }
    }

    return auth.handler(request);
  },
};
