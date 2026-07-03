export type ParsedSearchCategory =
  | "moto"
  | "peca"
  | "servico"
  | "oficina"
  | "financiamento"
  | "seguro"
  | "guincho"
  | "concessionaria";

export interface ParsedSearchResult {
  rawQuery: string;
  category: ParsedSearchCategory;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  partType: string | null;
  serviceType: string | null;
  urgency: "normal" | "urgente";
  confidence: number;
  suggestedText: string;
}

const BRANDS = [
  "honda",
  "yamaha",
  "suzuki",
  "kawasaki",
  "harley davidson",
  "harley-davidson",
  "bmw",
  "ducati",
  "triumph",
  "royal enfield",
  "ktm",
  "dafra",
  "shineray",
  "haojue",
  "agv",
  "shoei",
  "arai",
  "ls2",
  "texx",
  "norton",
  "moto guzzi",
];

const PART_TYPES: Array<{ key: string; words: string[] }> = [
  { key: "capacete", words: ["capacete"] },
  { key: "pneu", words: ["pneu", "pneus"] },
  { key: "escapamento", words: ["escapamento", "escape", "ponteira"] },
  { key: "eletrica", words: ["elétrica", "eletrica", "bateria", "chicote", "estator"] },
  { key: "oleo", words: ["óleo", "oleo", "filtro de óleo", "filtro de oleo"] },
  { key: "pastilha_freio", words: ["pastilha de freio", "pastilha", "freio"] },
  { key: "corrente_relacao", words: ["corrente", "relação", "relacao", "kit relação", "kit relacao"] },
  { key: "carenagem", words: ["carenagem", "carenagens"] },
  { key: "pneu_traseiro", words: ["câmara de ar", "camara de ar"] },
];

const SERVICE_TYPES: Array<{ key: string; words: string[] }> = [
  { key: "mecanico", words: ["mecânico", "mecanico", "conserto", "consertar"] },
  { key: "revisao", words: ["revisão", "revisao"] },
  { key: "troca_oleo", words: ["troca de óleo", "troca de oleo"] },
  { key: "eletrica_servico", words: ["problema elétrico", "problema eletrico", "elétrica não funciona"] },
  { key: "pintura", words: ["pintura", "pintar"] },
  { key: "funilaria", words: ["funilaria", "amassado"] },
  { key: "alinhamento", words: ["alinhamento", "balanceamento"] },
];

const URGENT_WORDS = [
  "urgente",
  "urgência",
  "urgencia",
  "agora",
  "socorro",
  "emergência",
  "emergencia",
  "rápido",
  "rapido",
  "já",
  "quebrou",
  "quebrada",
  "parada na estrada",
  "guincho",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesWord(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

export function parseNaturalQuery(query: string, city?: string | null): ParsedSearchResult {
  const q = query.trim();
  const norm = normalize(q);

  let category: ParsedSearchCategory = "peca";
  let subcategory: string | null = null;
  let brand: string | null = null;
  let model: string | null = null;
  let partType: string | null = null;
  let serviceType: string | null = null;
  let confidence = 0.4;

  for (const b of BRANDS) {
    if (includesWord(norm, b)) {
      brand = b.replace(/\b\w/g, (c) => c.toUpperCase());
      confidence += 0.15;
      break;
    }
  }

  const modelMatch = q.match(/\b\d{2,3}\/\d{2}-\d{2}\b/) ?? q.match(/\bcb\s?\d{3,4}\b/i) ?? q.match(/\bcg\s?\d{3}\b/i) ?? q.match(/\bfazer\s?\d{3}\b/i) ?? q.match(/\bxre\s?\d{3}\b/i);
  if (modelMatch) {
    model = modelMatch[0].toUpperCase();
    confidence += 0.1;
  }

  let matchedService: { key: string; words: string[] } | undefined;
  for (const s of SERVICE_TYPES) {
    if (s.words.some((w) => includesWord(norm, w))) {
      matchedService = s;
      break;
    }
  }

  let matchedPart: { key: string; words: string[] } | undefined;
  for (const p of PART_TYPES) {
    if (p.words.some((w) => includesWord(norm, w))) {
      matchedPart = p;
      break;
    }
  }

  if (includesWord(norm, "guincho")) {
    category = "guincho";
    subcategory = "guincho";
    confidence += 0.35;
  } else if (includesWord(norm, "concession")) {
    category = "concessionaria";
    confidence += 0.3;
  } else if (includesWord(norm, "financiamento") || includesWord(norm, "financiar")) {
    category = "financiamento";
    confidence += 0.3;
  } else if (includesWord(norm, "seguro")) {
    category = "seguro";
    confidence += 0.3;
  } else if (includesWord(norm, "oficina") || matchedService) {
    category = matchedService ? "servico" : "oficina";
    serviceType = matchedService?.key ?? null;
    subcategory = matchedService?.key ?? "oficina";
    confidence += 0.3;
  } else if (matchedPart) {
    category = "peca";
    partType = matchedPart.key;
    subcategory = matchedPart.key;
    confidence += 0.3;
  } else if (
    includesWord(norm, "comprar moto") ||
    includesWord(norm, "vender moto") ||
    includesWord(norm, "quero uma moto") ||
    includesWord(norm, "procuro uma moto") ||
    (includesWord(norm, "moto") && !includesWord(norm, "motoboy"))
  ) {
    category = "moto";
    confidence += 0.25;
  } else if (includesWord(norm, "peça") || includesWord(norm, "peca")) {
    category = "peca";
    confidence += 0.15;
  }

  const urgency: "normal" | "urgente" = URGENT_WORDS.some((w) => includesWord(norm, w)) ? "urgente" : "normal";
  if (urgency === "urgente") confidence += 0.1;

  confidence = Math.max(0.2, Math.min(1, confidence));

  const CATEGORY_LABELS: Record<ParsedSearchCategory, string> = {
    moto: "Motos",
    peca: "Peças",
    servico: "Serviços",
    oficina: "Oficinas",
    financiamento: "Financiamento",
    seguro: "Seguro",
    guincho: "Guincho",
    concessionaria: "Concessionária",
  };

  const parts: string[] = [CATEGORY_LABELS[category]];
  if (brand) parts.push(brand);
  if (model) parts.push(model);
  if (partType) parts.push(partType.replace(/_/g, " "));
  if (serviceType) parts.push(serviceType.replace(/_/g, " "));
  if (city) parts.push(`em ${city}`);
  if (urgency === "urgente") parts.push("(urgente)");

  return {
    rawQuery: q,
    category,
    subcategory,
    brand,
    model,
    partType,
    serviceType,
    urgency,
    confidence: Math.round(confidence * 100) / 100,
    suggestedText: parts.join(" · "),
  };
}
