import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    if (secret !== "tuentrega-setup-2024") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const email = "lgramirodecampos@gmail.com";

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
      return Response.json({ ok: true, message: "Role updated to admin", email });
    }

    const ctx = await (auth as any).$context;
    const result = await ctx.internalAdapter.createUser({
      email,
      name: "Admin Master",
      emailVerified: true,
      role: "admin",
    });

    if (!result) {
      return Response.json({ error: "Failed to create user" }, { status: 500 });
    }

    await ctx.internalAdapter.linkAccount({
      userId: result.id,
      providerId: "credential",
      accountId: email,
      password: await ctx.password.hash("123456"),
    });

    await db.update(users).set({ role: "admin" }).where(eq(users.id, result.id));

    return Response.json({ ok: true, message: "Admin created", email, id: result.id });
  },
};
