import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Bike } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="container flex flex-col items-center justify-center text-center py-32">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bike className="w-10 h-10 text-primary" />
        </div>
        <p className="text-8xl font-black text-primary mb-4">404</p>
        <h1 className="text-3xl font-black mb-3">Página não encontrada</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          A página que você está procurando não existe ou foi movida. Volte ao início e continue explorando.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link href="/">Ir para o início</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pecas">Ver peças</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/motos">Ver motos</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
