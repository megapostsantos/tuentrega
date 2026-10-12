import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((import.meta as any).env?.VITE_APP_URL as string | undefined) || "http://localhost:5173",
  plugins: [adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
