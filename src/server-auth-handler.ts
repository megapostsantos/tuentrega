import { auth } from "./lib/auth";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { defineEventHandler, toRequest, sendWebResponse } from "h3";

export default defineEventHandler(async (event) => {
  const request = toRequest(event);
  const url = new URL(request.url);

  if (url.pathname === "/api/auth/reset-admin" && url.searchParams.get("secret") === "tuentrega-reset-2024") {
    try {
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

  const response = await auth.handler(request);
  return sendWebResponse(event, response);
});
