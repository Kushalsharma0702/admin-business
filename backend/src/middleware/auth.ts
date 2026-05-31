import { Hono } from "hono";
import { verify } from "hono/jwt";
import { JWT_SECRET } from "../routes/auth";

export type JwtPayload = { sub: string; role: string; name: string };

/** Middleware: require valid JWT. Attaches payload to c.set("jwtPayload", ...) */
export function requireAuth(role?: "admin" | "client") {
  return async (c: Parameters<Parameters<Hono["use"]>[0]>[0], next: () => Promise<void>) => {
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return c.json({ success: false, message: "Unauthorized — missing token" }, 401);
    }
    try {
      const payload = await verify(token, JWT_SECRET) as JwtPayload;
      if (role && payload.role !== role) {
        return c.json({ success: false, message: "Forbidden — insufficient role" }, 403);
      }
      c.set("jwtPayload", payload);
      await next();
    } catch {
      return c.json({ success: false, message: "Unauthorized — invalid or expired token" }, 401);
    }
  };
}
