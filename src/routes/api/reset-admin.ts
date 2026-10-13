import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// One-time endpoint to reset admin user with correct Better Auth password hash
// Call: GET /api/reset-admin?secret=tuentrega-reset-2024
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    if (secret !== "tuentrega-reset-2024") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const email = "lgramirodecampos@gmail.com";
    const password = "123456";

    try {
      const ctx = await (auth as any).$context;

      // Delete existing accounts and user
      await ctx.internalAdapter.deleteUser(
        (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]?.id ?? ""
      ).catch(() => {});

      // Create fresh via Better Auth (uses correct scrypt hash internally)
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
        password: await ctx.password.hash(password),
      });

      // Ensure role is admin
      await db.update(users).set({ role: "admin" }).where(eq(users.id, result.id));

      return Response.json({
        ok: true,
        message: "Admin criado com sucesso via Better Auth",
        email,
        id: result.id,
      });
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "unknown error" }, { status: 500 });
    }
  },
};
