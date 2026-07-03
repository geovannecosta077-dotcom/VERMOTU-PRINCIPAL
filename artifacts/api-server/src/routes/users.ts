import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import {
  UpsertUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserPlanParams,
  UpdateUserPlanBody,
  SignInBody,
  SetUserCpfParams,
  SetUserCpfBody,
} from "@workspace/api-zod";
import { isValidCpf, normalizeCpf, normalizePhone, isValidPhone } from "../utils/cpf.js";

const router: IRouter = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

type UserRow = typeof usersTable.$inferSelect;
type PublicUser = Omit<UserRow, "passwordHash" | "loginAttempts" | "lockedUntil">;
function publicUser(row: UserRow): PublicUser {
  const { passwordHash: _ph, loginAttempts: _la, lockedUntil: _lu, ...rest } = row;
  return rest;
}

router.get("/users", async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable);
  res.json(rows.map(publicUser));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = UpsertUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos. Verifique nome, e-mail, senha e telefone." });
    return;
  }
  const { name, email, password, phone } = parsed.data;
  const phoneDigits = normalizePhone(phone);
  if (!isValidPhone(phoneDigits)) {
    res.status(400).json({ error: "Telefone inválido. Use DDD + número (ex: 21999999999)." });
    return;
  }

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existingEmail) {
    res.status(409).json({ error: "Já existe uma conta com este e-mail." });
    return;
  }
  const [existingPhone] = await db.select().from(usersTable).where(eq(usersTable.phone, phoneDigits));
  if (existingPhone) {
    res.status(409).json({ error: "Já existe uma conta com este telefone." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const publicId = `MH-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
  const { accountType, acceptedTerms } = parsed.data as { accountType?: string | null; acceptedTerms?: boolean | null };
  const [created] = await db
    .insert(usersTable)
    .values({
      publicId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phoneDigits,
      accountType: accountType ?? "pessoa",
      acceptedTerms: acceptedTerms ?? false,
      acceptedTermsAt: acceptedTerms ? new Date() : null,
      phoneVerified: true,
      plan: "free",
      isAdmin: false,
    })
    .returning();
  res.status(201).json(publicUser(created!));
});

router.post("/users/signin", async (req, res): Promise<void> => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe e-mail e senha." });
    return;
  }
  const { email, password } = parsed.data;
  const [row] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!row) {
    res.status(401).json({ error: "E-mail ou senha incorretos." });
    return;
  }

  if (row.lockedUntil && row.lockedUntil > new Date()) {
    const minutes = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000);
    res.status(429).json({
      error: `Conta bloqueada por tentativas excessivas. Tente novamente em ${minutes} minuto(s).`,
      lockedUntil: row.lockedUntil.toISOString(),
    });
    return;
  }

  if (!row.passwordHash) {
    res.status(401).json({ error: "Conta sem senha definida. Use a opção 'Definir senha' para criar uma.", needsPassword: true });
    return;
  }

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) {
    const newAttempts = (row.loginAttempts ?? 0) + 1;
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await db.update(usersTable).set({ loginAttempts: 0, lockedUntil }).where(eq(usersTable.id, row.id));
      res.status(429).json({ error: `Muitas tentativas incorretas. Conta bloqueada por 15 minutos.`, lockedUntil: lockedUntil.toISOString() });
    } else {
      await db.update(usersTable).set({ loginAttempts: newAttempts }).where(eq(usersTable.id, row.id));
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      res.status(401).json({ error: `E-mail ou senha incorretos. ${remaining} tentativa(s) restante(s) antes do bloqueio.` });
    }
    return;
  }

  if (row.banned) {
    res.status(403).json({ error: "Sua conta foi suspensa. Fale com o suporte." });
    return;
  }

  await db.update(usersTable).set({ loginAttempts: 0, lockedUntil: sql`NULL` }).where(eq(usersTable.id, row.id));
  res.json(publicUser(row));
});

router.post("/users/set-password", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "Informe e-mail e nova senha." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter ao menos 6 caracteres." });
    return;
  }
  const [row] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!row) {
    res.status(404).json({ error: "E-mail não encontrado." });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [updated] = await db
    .update(usersTable)
    .set({ passwordHash, loginAttempts: 0, lockedUntil: sql`NULL` })
    .where(eq(usersTable.id, row.id))
    .returning();
  res.json(publicUser(updated!));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const p = GetUserParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, p.data.id));
  if (!row) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(publicUser(row));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const p = UpdateUserParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = UpdateUserBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = { ...b.data };
  if (typeof b.data.phone === "string") {
    const digits = normalizePhone(b.data.phone);
    if (!isValidPhone(digits)) {
      res.status(400).json({ error: "Telefone inválido." });
      return;
    }
    const [conflict] = await db.select().from(usersTable).where(eq(usersTable.phone, digits));
    if (conflict && conflict.id !== p.data.id) {
      res.status(409).json({ error: "Telefone já cadastrado em outra conta." });
      return;
    }
    updates.phone = digits;
  }
  const [row] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, p.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(publicUser(row));
});

router.patch("/users/:id/cpf", async (req, res): Promise<void> => {
  const p = SetUserCpfParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = SetUserCpfBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: "CPF inválido." });
    return;
  }
  const cpf = normalizeCpf(b.data.cpf);
  if (!isValidCpf(cpf)) {
    res.status(400).json({ error: "CPF inválido. Verifique os números digitados." });
    return;
  }
  const [conflict] = await db.select().from(usersTable).where(eq(usersTable.cpf, cpf));
  if (conflict && conflict.id !== p.data.id) {
    res.status(409).json({ error: "CPF já cadastrado em outra conta." });
    return;
  }
  const [row] = await db
    .update(usersTable)
    .set({ cpf, accountVerified: true })
    .where(eq(usersTable.id, p.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(publicUser(row));
});

router.patch("/users/:id/plan", async (req, res): Promise<void> => {
  const p = UpdateUserPlanParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = UpdateUserPlanBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [row] = await db
    .update(usersTable)
    .set({ plan: b.data.plan })
    .where(eq(usersTable.id, p.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(publicUser(row));
});

export default router;
