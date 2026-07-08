import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { Listings } from "@/pages/listings";
import { ItemDetail } from "@/pages/item-detail";
import { Anunciar } from "@/pages/anunciar";
import { Busca } from "@/pages/busca";
import { Conta } from "@/pages/conta";
import { Chat } from "@/pages/chat";
import { Admin } from "@/pages/admin";
import { Planos } from "@/pages/planos";
import { Cart } from "@/pages/cart";
import { Checkout } from "@/pages/checkout";
import { Pedidos } from "@/pages/pedidos";
import { Oficinas } from "@/pages/oficinas";
import { Sobre } from "@/pages/sobre";
import { Contato } from "@/pages/contato";
import { Privacidade } from "@/pages/privacidade";
import { Termos } from "@/pages/termos";
import { Loja } from "@/pages/loja";
import { Blog } from "@/pages/blog";
import { BlogPost } from "@/pages/blog-post";
import { Oportunidades } from "@/pages/oportunidades";
import { Seguranca } from "@/pages/seguranca";
import { useSession } from "@/lib/session";
import { useEffect } from "react";
import { setExtraHeadersGetter } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

// Send the logged-in user's id on every API request so the server can
// enforce admin-only endpoints (see requireAdmin middleware). This mirrors
// the app's lightweight, passcode-based admin model rather than full RBAC.
setExtraHeadersGetter(() => {
  const userId = useSession.getState().currentUserId;
  return userId ? { "x-user-id": String(userId) } : null;
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/motos">{() => <Listings type="moto" title="Motos" subtitle="Encontre a moto perfeita para você" />}</Route>
        <Route path="/motos/:id" component={ItemDetail} />
        <Route path="/pecas">{() => <Listings type="peca" title="Peças e acessórios" subtitle="Tudo o que sua moto precisa" />}</Route>
        <Route path="/pecas/:id" component={ItemDetail} />
        <Route path="/servicos">{() => <Listings type="servico" title="Serviços" subtitle="Oficinas e mecânicos parceiros" />}</Route>
        <Route path="/servicos/:id" component={ItemDetail} />
        <Route path="/oficinas" component={Oficinas} />
        <Route path="/busca" component={Busca} />
        <Route path="/anunciar" component={Anunciar} />
        <Route path="/carrinho" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/pedidos" component={Pedidos} />
        <Route path="/conta" component={Conta} />
        <Route path="/loja/:id" component={Loja} />
        <Route path="/chat" component={Chat} />
        <Route path="/chat/:id" component={Chat} />
        <Route path="/admin" component={Admin} />
        <Route path="/planos" component={Planos} />
        <Route path="/sobre" component={Sobre} />
        <Route path="/contato" component={Contato} />
        <Route path="/privacidade" component={Privacidade} />
        <Route path="/termos" component={Termos} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/oportunidades" component={Oportunidades} />
        <Route path="/seguranca" component={Seguranca} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function ThemedApp() {
  const theme = useSession((s) => s.theme);
  return (
    <div className={theme}>
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ThemedApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
