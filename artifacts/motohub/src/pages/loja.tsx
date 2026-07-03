import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetUser, useListItems, getGetUserQueryKey } from "@workspace/api-client-react";
import { ItemCard } from "@/components/item-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, MapPin, ShieldCheck, Phone, Crown } from "lucide-react";

export function Loja() {
  const [, params] = useRoute("/loja/:id");
  const sellerId = Number(params?.id ?? 0);

  const { data: seller, isLoading } = useGetUser(sellerId, {
    query: { enabled: !!sellerId, queryKey: getGetUserQueryKey(sellerId) },
  });
  const { data: items } = useListItems({ sellerId });

  useEffect(() => {
    document.title = seller ? `${seller.storeName ?? seller.name} — MotoHub` : "Loja — MotoHub";
  }, [seller]);

  if (isLoading) {
    return <Layout><div className="container py-10"><Skeleton className="h-40 rounded-xl" /></div></Layout>;
  }
  if (!seller) {
    return <Layout><div className="container py-20 text-center"><p className="text-muted-foreground mb-4">Loja não encontrada.</p><Button asChild><Link href="/">Voltar</Link></Button></div></Layout>;
  }

  const active = (items ?? []).filter((i) => i.status === "active");
  const rawPhone = seller.phone?.replace(/\D/g, "") ?? "";
  const wppHref = rawPhone
    ? `https://wa.me/${rawPhone.startsWith("55") ? rawPhone : "55" + rawPhone}`
    : null;

  return (
    <Layout>
      <section className="bg-gradient-to-br from-red-950/30 via-black to-background border-b border-border">
        <div className="container py-10 flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black">
              {(seller.storeName ?? seller.name).charAt(0)}
            </div>
            <div>
              {seller.accountVerified && (
                <Badge variant="outline" className="mb-2"><ShieldCheck className="w-3 h-3 mr-1" /> Vendedor verificado</Badge>
              )}
              <h1 className="text-3xl md:text-4xl font-black">{seller.storeName ?? seller.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {seller.city ?? "Rio de Janeiro"}</span>
                {seller.plan !== "free" && (
                  <Badge variant="outline" className="capitalize gap-1"><Crown className="w-3 h-3" /> {seller.plan}</Badge>
                )}
              </div>
              {seller.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{seller.bio}</p>}
            </div>
          </div>
          {wppHref && (
            <Button asChild className="shadow-md shadow-primary/20">
              <a href={wppHref} target="_blank" rel="noreferrer"><Phone className="w-4 h-4 mr-2" /> Falar no WhatsApp</a>
            </Button>
          )}
        </div>
      </section>

      <section className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Anúncios da loja</h2>
          <span className="text-sm text-muted-foreground">{active.length} ativos</span>
        </div>
        {active.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">Esta loja ainda não tem anúncios ativos.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}
