import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { ItemCard } from "@/components/item-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListItems, useSmartSearch, type Item } from "@workspace/api-client-react";
import { useSession, getAnonSessionId, formatBRL } from "@/lib/session";
import { Search, Zap, SlidersHorizontal, X } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface Props {
  type: "moto" | "peca" | "servico";
  title: string;
  subtitle: string;
}

const MOTO_BRANDS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "BMW", "Ducati", "KTM", "Royal Enfield", "Harley-Davidson", "Triumph", "Bajaj", "Shineray", "Dafra"];
const PRICE_RANGES = [
  { label: "Até R$ 5 mil",    min: 0,     max: 5000 },
  { label: "R$ 5 – 15 mil",   min: 5000,  max: 15000 },
  { label: "R$ 15 – 30 mil",  min: 15000, max: 30000 },
  { label: "R$ 30 – 60 mil",  min: 30000, max: 60000 },
  { label: "Acima de R$ 60 mil", min: 60000, max: Infinity },
];

export function Listings({ type, title, subtitle }: Props) {
  const search = useSearch();
  const initialQ = useMemo(() => new URLSearchParams(search).get("q") ?? "", [search]);
  const [q, setQ] = useState(initialQ);
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<string>("inteligente");
  const [condition, setCondition] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const currentUserId = useSession((s) => s.currentUserId);

  useEffect(() => { document.title = `${title} — Vermotu`; }, [title]);
  useEffect(() => setQ(initialQ), [initialQ]);

  const { data, isLoading } = useListItems({
    type,
    q: q || undefined,
    brand: brand !== "all" ? brand : undefined,
  });

  const { data: smart, isLoading: smartLoading } = useSmartSearch(
    { type, query: q || undefined, userId: currentUserId ?? undefined, sessionId: getAnonSessionId(), limit: 60 },
    { query: { enabled: sort === "inteligente", queryKey: ["smart-search", type, q, currentUserId] as readonly unknown[] } },
  );

  const brands = useMemo(() => {
    const all = new Set<string>();
    (data ?? []).forEach((i) => i.brand && all.add(i.brand));
    return Array.from(all).sort();
  }, [data]);

  const selectedPriceRange = PRICE_RANGES.find((r) => `${r.min}-${r.max}` === priceRange);

  const items: Item[] = useMemo(() => {
    let arr: Item[];
    if (sort === "inteligente") {
      arr = (smart?.results ?? []).filter((i) => brand === "all" || i.brand === brand);
    } else {
      arr = [...(data ?? [])];
      if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
      else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
      else arr.sort((a, b) => Number(b.premium) - Number(a.premium));
    }

    if (condition !== "all") arr = arr.filter((i) => i.condition === condition);
    if (selectedPriceRange) {
      arr = arr.filter((i) => i.price >= selectedPriceRange.min && i.price < (selectedPriceRange.max === Infinity ? 1e10 : selectedPriceRange.max));
    }
    return arr;
  }, [data, smart, sort, brand, condition, selectedPriceRange]);

  const loading = sort === "inteligente" ? smartLoading : isLoading;

  const activeFiltersCount = [
    brand !== "all",
    condition !== "all",
    priceRange !== "all",
    sort !== "inteligente",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setBrand("all");
    setCondition("all");
    setPriceRange("all");
    setSort("inteligente");
  };

  return (
    <Layout>
      <section className="container py-8 md:py-10">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar em ${title.toLowerCase()}...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            className={cn("shrink-0 relative", showFilters && "border-primary text-primary")}
            aria-label="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="rounded-xl border border-border bg-card/60 p-4 mb-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Sort */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Ordenar por</p>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inteligente">Recomendados</SelectItem>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="price-asc">Menor preço</SelectItem>
                    <SelectItem value="price-desc">Maior preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Brand */}
              {type === "moto" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Marca</p>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as marcas</SelectItem>
                      {(brands.length > 0 ? brands : MOTO_BRANDS).map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Condition */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Condição</p>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price range */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Faixa de preço</p>
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Qualquer preço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer preço</SelectItem>
                    {PRICE_RANGES.map((r) => (
                      <SelectItem key={r.label} value={`${r.min}-${r.max}`}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <div className="flex flex-wrap gap-1.5">
                  {brand !== "all" && <Badge variant="secondary" className="gap-1 text-xs">{brand} <button onClick={() => setBrand("all")}><X className="w-3 h-3" /></button></Badge>}
                  {condition !== "all" && <Badge variant="secondary" className="gap-1 text-xs capitalize">{condition} <button onClick={() => setCondition("all")}><X className="w-3 h-3" /></button></Badge>}
                  {priceRange !== "all" && selectedPriceRange && <Badge variant="secondary" className="gap-1 text-xs">{selectedPriceRange.label} <button onClick={() => setPriceRange("all")}><X className="w-3 h-3" /></button></Badge>}
                </div>
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Nenhum resultado"
                : <><span className="font-semibold text-foreground">{items.length}</span> {items.length === 1 ? "resultado" : "resultados"}</>}
              {q && <> para <span className="font-medium text-foreground">"{q}"</span></>}
            </p>
            {/* Mobile sort shortcut */}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 w-auto text-xs border-none shadow-none text-muted-foreground sm:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inteligente">Recomendados</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <div>
              <p className="font-semibold mb-1">Nenhum resultado encontrado</p>
              <p className="text-sm text-muted-foreground">
                {activeFiltersCount > 0 ? "Tente remover alguns filtros." : "Tente uma busca diferente ou use a Busca Inteligente."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/busca">
                  <Zap className="w-4 h-4 mr-2" /> Busca Inteligente
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

        {/* Smart search CTA */}
        {!loading && items.length > 0 && (
          <div className="mt-10 pt-8 border-t border-border/40 text-center">
            <Link href="/busca">
              <div className="inline-flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors px-6 py-4 cursor-pointer">
                <Zap className="w-5 h-5 text-primary shrink-0" />
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
