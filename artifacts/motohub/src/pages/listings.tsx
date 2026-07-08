import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { ItemCard } from "@/components/item-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListItems, useSmartSearch, type Item } from "@workspace/api-client-react";
import { useSession, getAnonSessionId } from "@/lib/session";
import { Search, Zap } from "lucide-react";
import { Link } from "wouter";

interface Props {
  type: "moto" | "peca" | "servico";
  title: string;
  subtitle: string;
}

export function Listings({ type, title, subtitle }: Props) {
  const search = useSearch();
  const initialQ = useMemo(() => new URLSearchParams(search).get("q") ?? "", [search]);
  const [q, setQ] = useState(initialQ);
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<string>("inteligente");
  const currentUserId = useSession((s) => s.currentUserId);

  useEffect(() => {
    document.title = `${title} — Vermotu`;
  }, [title]);

  useEffect(() => setQ(initialQ), [initialQ]);

  const { data, isLoading } = useListItems({
    type,
    q: q || undefined,
    brand: brand !== "all" ? brand : undefined,
  });

  // Smart-ranked order (relevance + quality + proximity) — the Vermotu ranking algorithm
  const { data: smart, isLoading: smartLoading } = useSmartSearch(
    { type, query: q || undefined, userId: currentUserId ?? undefined, sessionId: getAnonSessionId(), limit: 60 },
    { query: { enabled: sort === "inteligente", queryKey: ["smart-search", type, q, currentUserId] as readonly unknown[] } },
  );

  const brands = useMemo(() => {
    const all = new Set<string>();
    (data ?? []).forEach((i) => i.brand && all.add(i.brand));
    return Array.from(all).sort();
  }, [data]);

  const items: Item[] = useMemo(() => {
    if (sort === "inteligente") {
      const brandFiltered = (smart?.results ?? []).filter((i) => brand === "all" || i.brand === brand);
      return brandFiltered;
    }
    const arr = [...(data ?? [])];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else arr.sort((a, b) => Number(b.premium) - Number(a.premium));
    return arr;
  }, [data, smart, sort, brand]);

  const loading = sort === "inteligente" ? smartLoading : isLoading;

  return (
    <Layout>
      <section className="container py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">{subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          {type === "moto" && (
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inteligente">Recomendados</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-6">Nenhum resultado encontrado. Tente outra busca.</p>
            <Link href={`/oportunidades`}>
              <div className="inline-flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-6 py-4 hover:bg-primary/10 transition-colors cursor-pointer">
                <Zap className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Não encontrou o que procura?</p>
                  <p className="text-xs text-muted-foreground">Use a Busca Inteligente — fornecedores enviam propostas para você</p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

        {/* Always show smart-search CTA at bottom */}
        {!loading && items.length > 0 && (
          <div className="mt-12 border-t border-border/40 pt-8 text-center">
            <Link href="/oportunidades">
              <div className="inline-flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-6 py-4 hover:bg-primary/10 transition-colors cursor-pointer">
                <Zap className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Não encontrou exatamente o que queria?</p>
                  <p className="text-xs text-muted-foreground">Descreva e receba propostas de fornecedores verificados</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </section>
    </Layout>
  );
}
