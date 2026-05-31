import { Hono } from "hono";
import db from "../db";
import { fail, ok, verifyPassword, nowIso } from "../helpers";
import { sign } from "hono/jwt";

export const JWT_SECRET = process.env.JWT_SECRET ?? "taxease-dev-secret-2026";

const auth = new Hono();

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return c.json(fail("email and password are required"), 400);

  const user = db
    .query("SELECT * FROM users WHERE email = ?")
    .get(email) as Record<string, unknown> | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash as string))) {
    return c.json(fail("Invalid email or password"), 401);
  }

  const token = await sign(
    { sub: user.id as string, role: user.role as string, name: user.name as string, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 },
    JWT_SECRET,
  );

  return c.json(
    ok(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portalStatus: user.portal_status,
        },
      },
      "Login successful",
    ),
  );
});

/** Quick "who am I" check */
auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return c.json(fail("Unauthorized"), 401);

  try {
    const { verify } = await import("hono/jwt");
    const payload = await verify(token, JWT_SECRET) as { sub: string };
    const user = db.query("SELECT id, email, name, role, portal_status FROM users WHERE id = ?").get(payload.sub) as Record<string, unknown>;
    if (!user) return c.json(fail("User not found"), 404);
    return c.json(ok({ id: user.id, email: user.email, name: user.name, role: user.role, portalStatus: user.portal_status }));
  } catch {
    return c.json(fail("Invalid token"), 401);
  }
});

export default auth;
