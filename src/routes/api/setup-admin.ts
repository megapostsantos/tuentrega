import { createAPIFileRoute } from "@tanstack/start/api";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// One-time endpoint to create the master admin user.
// DELETE this file after running it once.
export const APIRoute = createAPIFileRoute("/api/setup-admin")({
  GET: async ({ request }) => {
    const secret = new URL(request.url).searchParams.get("secret");
    if (secret !== "tuentrega-setup-2024") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const email = "lgramirodecampos@gmail.com";

    // Check if already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      // Update role to admin
      await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
      return Response.json({ ok: true, message: "Role updated to admin", email });
    }

    // Create user via Better Auth
    const ctx = await auth.$context;
    const result = await ctx.internalAdapter.createUser({
      email,
      name: "Admin Master",
      emailVerified: true,
      role: "admin",
    });

    if (!result) {
      return Response.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Set password
    await ctx.internalAdapter.linkAccount({
      userId: result.id,
      providerId: "credential",
      accountId: email,
      password: await ctx.password.hash("123456"),
    });

    // Ensure role is admin
    await db.update(users).set({ role: "admin" }).where(eq(users.id, result.id));

    return Response.json({ ok: true, message: "Admin created", email, id: result.id });
  },
});
