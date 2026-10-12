// Better Auth API route handler
// This catches all /api/auth/* requests and passes them to Better Auth
import { auth } from "@/lib/auth";

export default {
  async fetch(request: Request): Promise<Response> {
    return auth.handler(request);
  },
};
