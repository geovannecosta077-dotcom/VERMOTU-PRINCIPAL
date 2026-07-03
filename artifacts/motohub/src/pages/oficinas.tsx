import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { useListItems } from "@workspace/api-client-react";
import { ItemCard } from "@/components/item-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, Clock, ShieldCheck } from "lucide-react";

export function Oficinas() {
  useEffect(() => { document.title = "Oficinas — MotoHub"; }, []);
  const { data, isLoading } = useListItems({ type: "servico" });

  return (
    <Layout>
      <section className="bg-gradient-to-br from-red-950/30 via-black to-background border-b border-border">
        <div className="container py-14">
          <Badge variant="outline" className="mb-3"><MapPin className="w-3 h-3 mr-1" /> Rio de Janeiro e região</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Oficinas perto de você</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Mecânicos verificados, atendimento rápido e os melhores preços. Solicite orçamento e agende em poucos cliques.
          </p>
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Mecânicos verificados</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Agendamento online</span>
            <span className="flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Revisão, troca e elétrica</span>
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (data ?? []).map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
        {(data ?? []).length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">Nenhuma oficina disponível no momento.</div>
        )}
      </section>
    </Layout>
  );
}
