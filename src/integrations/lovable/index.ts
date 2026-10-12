// Lovable integration removed — use Better Auth directly
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: unknown) => {
      return { error: new Error("OAuth not configured. Use email/password auth.") };
    },
  },
};
