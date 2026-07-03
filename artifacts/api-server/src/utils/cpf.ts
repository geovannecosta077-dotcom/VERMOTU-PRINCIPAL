export function normalizeCpf(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map((c) => Number(c));

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i]! * (10 - i);
  let mod = sum % 11;
  const d1 = mod < 2 ? 0 : 11 - mod;
  if (d1 !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i]! * (11 - i);
  mod = sum % 11;
  const d2 = mod < 2 ? 0 : 11 - mod;
  return d2 === digits[10];
}

export function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidPhone(input: string): boolean {
  const p = normalizePhone(input);
  return p.length >= 10 && p.length <= 13;
}
