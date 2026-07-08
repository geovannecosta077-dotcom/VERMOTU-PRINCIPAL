import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetUser, useListItems, getGetUserQueryKey, getListItemsQueryKey } from "@workspace/api-client-react";
import { ItemCard } from "@/components/item-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, MapPin, ShieldCheck, Phone, Crown, Star, ExternalLink, Clock } from "lucide-react";

function MapEmbed({ city }: { city: string }) {
  const query = encodeURIComponent(`${city}, Brasil`);
  return (
    <div className="rounded-xl overflow-hidden border border-border w-full" style={{ height: 200 }}>
      <iframe
        title="Localização"
        width="100%"
        height="200"
        loading="lazy"
        src={`https://maps.google.com/maps?q=${query}&output=embed&z=13`}
        className="border-0"
        allowFullScreen
      />
    </div>
  );
}

export function Loja() {
  const [, params] = useRoute("/loja/:id");
  const sellerId = Number(params?.id ?? 0);

  const { data: seller, isLoading } = useGetUser(sellerId, {
    query: { enabled: !!sellerId, queryKey: getGetUserQueryKey(sellerId) },
  });
  const { data: items } = useListItems({ sellerId }, {
    query: { enabled: !!sellerId, queryKey: getListItemsQueryKey({ sellerId }) },
  });

  useEffect(() => {
    document.title = seller ? `${seller.storeName ?? seller.name} — Vermotu` : "Loja — Vermotu";
  }, [seller]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-10 space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }
  if (!seller) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Loja não encontrada.</p>
          <Button asChild><Link href="/">Voltar</Link></Button>
        </div>
      </Layout>
    );
  }

  const active = (items ?? []).filter((i) => i.status === "active");
  const rawPhone = seller.phone?.replace(/\D/g, "") ?? "";
  const wppHref = rawPhone
    ? `https://wa.me/${rawPhone.startsWith("55") ? rawPhone : "55" + rawPhone}`
    : null;

  const storeName = seller.storeName?.trim() || seller.name;

  // Aggregate rating from items
  const ratedItems = active.filter((i) => (i.ratingCount ?? 0) > 0);
  const avgRating = ratedItems.length > 0
    ? ratedItems.reduce((s, i) => s + (i.ratingAvg ?? 0), 0) / ratedItems.length
    : 0;
  const totalReviews = active.reduce((s, i) => s + (i.ratingCount ?? 0), 0);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-br from-red-950/30 via-black to-background border-b border-border">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0 border border-primary/20">
                {storeName.charAt(0).toUpperCase()}
              </div>
              <div>
                {seller.accountVerified && (
                  <Badge variant="outline" className="mb-2 border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Vendedor verificado
                  </Badge>
                )}
                <h1 className="text-3xl md:text-4xl font-black text-white">{storeName}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mt-1">
                  {seller.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {seller.city}
                    </span>
                  )}
                  {seller.plan !== "free" && (
                    <Badge variant="outline" className="capitalize gap-1 border-amber-500/30 text-amber-400">
                      <Crown className="w-3 h-3" /> {seller.plan}
                    </Badge>
                  )}
                </div>
                {seller.bio && (
                  <p className="text-sm text-gray-400 mt-2 max-w-xl">{seller.bio}</p>
                )}
                {totalReviews > 0 && avgRating > 0 && (
                  <div className="flex items-center gap-1.5 mt-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-sm font-semibold text-white">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({totalReviews} avaliações)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {wppHref && (
                <Button asChild className="shadow-md shadow-primary/20">
                  <a href={wppHref} target="_blank" rel="noreferrer">
                    <Phone className="w-4 h-4 mr-2" /> Falar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container py-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Main: items */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Anúncios da loja
            </h2>
            <span className="text-sm text-muted-foreground">{active.length} ativo{active.length !== 1 ? "s" : ""}</span>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              Esta loja ainda não tem anúncios ativos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {active.map((it) => <ItemCard key={it.id} item={it} />)}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Contact info card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Informações</h3>
            {seller.city && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{seller.city}</span>
              </div>
            )}
            {wppHref && (
              <a
                href={wppHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" />
                {seller.phone}
              </a>
            )}
          </div>

          {/* Business hours */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Horário de atendimento
            </h3>
            {seller.accountType === "empresa" && seller.businessHoursOpen && seller.businessHoursClose ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{seller.businessHoursOpen} – {seller.businessHoursClose}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {wppHref ? (
                  <a href={wppHref} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">
                    Consultar disponibilidade via WhatsApp
                  </a>
                ) : "Consultar disponibilidade"}
              </p>
            )}
          </div>

          {/* Map */}
          {seller.city && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Localização
              </h3>
              <MapEmbed city={seller.city} />
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${seller.city}, Brasil`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
              </a>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Estatísticas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/40">
                <div className="text-xl font-black">{active.length}</div>
                <div className="text-xs text-muted-foreground">Anúncios</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/40">
                <div className="text-xl font-black">{totalReviews}</div>
                <div className="text-xs text-muted-foreground">Avaliações</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
