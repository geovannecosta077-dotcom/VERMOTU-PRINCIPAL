import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Typed with `any` params/body/query generics so this middleware is
// assignable alongside route handlers with more specific `Request<P, ...>`
// types (e.g. `req.params.id: string`) without TS unifying them into a
// wider `string | string[]` shape.
export async function requireAdmin(
  req: Request<any, any, any, any>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = req.headers["x-user-id"];
  const userId = rawId ? parseInt(String(rawId), 10) : NaN;
  if (isNaN(userId)) {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }
  next();
}
