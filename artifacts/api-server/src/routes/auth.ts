import { Router, type IRouter } from "express";
import { eq, isNull, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── In-memory rate limiter (per IP, window-based) ───────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

// Clean up expired entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

// ─── Strip sensitive fields ───────────────────────────────────────────────────
type UserRow = typeof usersTable.$inferSelect;
type PublicUser = Omit<UserRow, "passwordHash" | "loginAttempts" | "lockedUntil">;

function publicUser(row: UserRow): PublicUser {
  const { passwordHash: _ph, loginAttempts: _la, lockedUntil: _lu, ...rest } = row;
  return rest;
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
// Rate limit: 5 requests per hour per IP.
// Never reveals whether the email exists (prevents enumeration).
// Returns devToken when SMTP is not configured (development mode only).
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
  if (!checkRateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Muitas solicitações. Aguarde 1 hora e tente novamente." });
    return;
  }

  const { email } = (req.body as { email?: unknown }) ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Informe um e-mail válido." });
    return;
  }

  const normalised = email.toLowerCase().trim();
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, banned: usersTable.banned })
    .from(usersTable)
    .where(eq(usersTable.email, normalised));

  // Always return 200 to prevent email enumeration
  if (!user || user.banned) {
    res.json({ ok: true });
    return;
  }

  // Invalidate any existing unused tokens for this user before generating a new one
  await db
    .delete(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.userId, user.id),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );

  // 32-byte cryptographically secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });

  logger.info({ userId: user.id }, "Password reset token generated");

  // In production, send email here using SMTP env vars.
  // When SMTP is not configured, return the token so the dev can test the flow.
  const devMode = !process.env.SMTP_HOST;
  if (devMode) {
    logger.warn({ token }, "DEV MODE: password reset token returned in response (set SMTP_HOST to send emails)");
    res.json({ ok: true, devMode: true, devToken: token });
    return;
  }

  // TODO: send email via nodemailer when SMTP_HOST / SMTP_USER / SMTP_PASS are set
  res.json({ ok: true });
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
// Validates the reset token and sets a new password.
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
  if (!checkRateLimit(`reset:${ip}`, 10, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Muitas tentativas. Aguarde 1 hora e tente novamente." });
    return;
  }

  const { token, password } = (req.body as { token?: unknown; password?: unknown }) ?? {};

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    res.status(400).json({ error: "Token de recuperação inválido ou ausente." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "A nova senha deve ter ao menos 8 caracteres." });
    return;
  }

  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token.trim()));

  if (!resetToken) {
    res.status(400).json({ error: "Token inválido. Solicite um novo link de recuperação." });
    return;
  }
  if (resetToken.usedAt) {
    res.status(400).json({ error: "Este link já foi utilizado. Solicite um novo link de recuperação." });
    return;
  }
  if (resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Este link expirou (validade de 1 hora). Solicite um novo." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ passwordHash, loginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, resetToken.userId));
    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, resetToken.userId));
  if (!user) {
    res.status(500).json({ error: "Erro interno. Tente novamente." });
    return;
  }

  logger.info({ userId: user.id }, "Password successfully reset");
  res.json({ ok: true, user: publicUser(user) });
});

// ─── POST /auth/resend-verification ──────────────────────────────────────────
// Placeholder: resend email verification (when email infra is available).
router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
  if (!checkRateLimit(`resend:${ip}`, 3, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Muitas solicitações. Aguarde 1 hora e tente novamente." });
    return;
  }

  const { email } = (req.body as { email?: unknown }) ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Informe um e-mail válido." });
    return;
  }

  // Always return ok to prevent enumeration
  res.json({ ok: true });
});

export default router;
