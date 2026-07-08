import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useSession, useCart, imageUrl } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { Search, Menu, User, LogOut, PlusCircle, Settings, ShoppingCart, Package, Store, Wrench, Instagram, Facebook, Youtube, MessageCircle, HelpCircle, Shield, FileText, Phone, Sun, Moon, BookOpen, X, Bike, CircleDot, ChevronRight, Zap, Newspaper, Megaphone, Info, HeadphonesIcon, LayoutDashboard, CreditCard, QrCode, Banknote, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useGetUser, getGetUserQueryKey, useListItems, getListItemsQueryKey } from "@workspace/api-client-react";
import { LoginDialog } from "@/components/login-dialog";

export { LoginDialog };

const TYPE_LABELS: Record<string, string> = { moto: "Motos", peca: "Peças", servico: "Oficinas" };
const TYPE_ICONS: Record<string, React.ElementType> = { moto: Bike, peca: CircleDot, servico: Wrench };

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const currentUserId = useSession((s) => s.currentUserId);
  const adminUnlocked = useSession((s) => s.adminUnlocked);
  const setCurrentUserId = useSession((s) => s.setCurrentUserId);
  const loginOpen = useSession((s) => s.loginOpen);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const secretClickCount = useRef(0);
  const secretTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretClick = () => {
    secretClickCount.current += 1;
    if (secretTimer.current) clearTimeout(secretTimer.current);
    secretTimer.current = setTimeout(() => { secretClickCount.current = 0; }, 3000);
    if (secretClickCount.current >= 5) {
      secretClickCount.current = 0;
      setLocation("/admin");
    }
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 280);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchQuery = debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  const { data: searchResults } = useListItems(
    { q: searchQuery },
    { query: { enabled: !!searchQuery, staleTime: 10_000, queryKey: getListItemsQueryKey({ q: searchQuery }) } }
  );

  const suggestions = searchQuery ? (searchResults ?? []).slice(0, 8) : [];
  const grouped = suggestions.reduce<Record<string, typeof suggestions>>((acc, it) => {
    const t = it.type ?? "peca";
    if (!acc[t]) acc[t] = [];
    acc[t].push(it);
    return acc;
  }, {});

  const { data: currentUser } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });

  const handleLogout = () => {
    setCurrentUserId(null);
    toast.success("Você saiu da sua conta.");
    if (location === "/conta" || location === "/anunciar" || location === "/chat") {
      setLocation("/");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const q = encodeURIComponent(search.trim());
    setSearchOpen(false);
    setLocation(`/motos?q=${q}`);
  };

  const goToSuggestion = useCallback((it: { id: number; type: string }) => {
    setSearchOpen(false);
    setSearch("");
    const base = it.type === "moto" ? "motos" : it.type === "peca" ? "pecas" : "servicos";
    setLocation(`/${base}/${it.id}`);
  }, [setLocation]);

  const requireLogin = (target: string) => {
    if (currentUserId) {
      setLocation(target);
    } else {
      setLoginOpen(true);
    }
  };

  const handleAnunciar = () => {
    if (!currentUserId) {
      setLoginOpen(true);
      return;
    }
    setLocation("/anunciar");
  };

  const SearchBar = ({ mobile = false }: { mobile?: boolean }) => (
    <div ref={mobile ? undefined : searchRef} className="relative w-full">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar motos, peças, marcas, oficinas..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => { if (search.length >= 2) setSearchOpen(true); }}
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {searchOpen && debouncedSearch.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-[200] rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para <strong>"{debouncedSearch}"</strong>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICONS[type] ?? Store;
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />{TYPE_LABELS[type] ?? type}
                    </div>
                    {items.map((it) => {
                      const thumb = imageUrl(it.image);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => goToSuggestion(it)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                            {thumb
                              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{it.title}</div>
                            {it.brand && <div className="text-xs text-muted-foreground truncate">{it.brand} · {it.location}</div>}
                          </div>
                          <div className="text-sm font-bold text-primary shrink-0">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setLocation(`/motos?q=${encodeURIComponent(debouncedSearch)}`); }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
              >
                <span>Ver todos os resultados para "{debouncedSearch}"</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center gap-2 md:gap-3">
          {/* Logo — maior no mobile */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={handleSecretClick}>
            <img src="/logo-vermotu.png" alt="Vermotu" className="h-12 md:h-14 w-auto object-contain" />
          </Link>

          {/* Search bar — somente sm+ (mobile tem linha própria abaixo) */}
          <div className="hidden sm:flex flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Nav links — compact, after search */}
          <nav className="hidden lg:flex items-center shrink-0 ml-1">
            <Link href="/busca" className="px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-accent rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"><Zap className="w-3.5 h-3.5" />Busca Inteligente</Link>
            <Link href="/motos" className="px-2.5 py-1.5 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors whitespace-nowrap">Motos</Link>
            <Link href="/pecas" className="px-2.5 py-1.5 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors whitespace-nowrap">Peças</Link>
            <Link href="/oficinas" className="px-2.5 py-1.5 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors whitespace-nowrap">Oficinas</Link>
            <Link href="/blog" className="px-2.5 py-1.5 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"><BookOpen className="w-3.5 h-3.5" />Blog</Link>
            <Link href="/anunciar" className="px-2.5 py-1.5 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors whitespace-nowrap">Vender</Link>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Link href="/carrinho">
              <Button variant="ghost" size="icon" className="relative" aria-label="Carrinho">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-primary">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Button
              onClick={handleAnunciar}
              className="hidden md:inline-flex gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Anunciar
            </Button>

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{currentUser.name.split(" ")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/conta"><User className="w-4 h-4 mr-2" /> Minha conta</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pedidos"><Package className="w-4 h-4 mr-2" /> Meus pedidos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/chat">Mensagens</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/conta?tab=loja"><Store className="w-4 h-4 mr-2" /> Painel vendedor</Link>
                  </DropdownMenuItem>
                  {(adminUnlocked || currentUser?.isAdmin) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Settings className="w-4 h-4 mr-2" /> Painel admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={() => setLoginOpen(true)} className="hidden md:inline-flex">
                Entrar
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[360px] p-0 flex flex-col">
                {/* Brand header */}
                <div className="px-5 pt-7 pb-5 bg-gradient-to-br from-red-950/30 to-transparent border-b border-border/60 shrink-0">
                  <Link href="/" className="flex items-center gap-3">
                    <img src="/logo-vermotu.png" alt="Vermotu" className="h-12 w-auto object-contain" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">Marketplace de motos do Brasil</p>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-border/60 shrink-0" ref={searchRef}>
                  <SearchBar mobile />
                </div>

                {/* Scrollable nav */}
                <div className="flex-1 overflow-y-auto">
                  {/* Navegar */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Navegar</p>
                    {([
                      { href: "/motos", icon: Bike, label: "Motos" },
                      { href: "/pecas", icon: CircleDot, label: "Peças e acessórios" },
                      { href: "/oficinas", icon: Wrench, label: "Oficinas" },
                      { href: "/blog", icon: Newspaper, label: "Blog" },
                      { href: "/carrinho", icon: ShoppingCart, label: cartCount > 0 ? `Carrinho (${cartCount})` : "Carrinho" },
                    ] as const).map(({ href, icon: Icon, label }) => (
                      <Link key={href} href={href}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent transition-colors group">
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </span>
                        <span className="text-sm font-medium">{label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="mx-4 my-2 h-px bg-border" />

                  {/* Conta */}
                  <div className="px-3 pb-1">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Minha conta</p>
                    {currentUser ? (
                      <>
                        {([
                          { href: "/conta", icon: User, label: "Minha conta" },
                          { href: "/pedidos", icon: Package, label: "Meus pedidos" },
                          { href: "/chat", icon: MessageCircle, label: "Mensagens" },
                        ] as const).map(({ href, icon: Icon, label }) => (
                          <Link key={href} href={href}
                            className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent transition-colors group">
                            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                              <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </span>
                            <span className="text-sm font-medium">{label}</span>
                          </Link>
                        ))}
                        <button onClick={handleAnunciar}
                          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-primary/10 transition-colors group">
                          <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                            <Megaphone className="w-4 h-4 text-primary" />
                          </span>
                          <span className="text-sm font-semibold text-primary">Anunciar</span>
                        </button>
                      </>
                    ) : (
                      <div className="px-2 py-2">
                        <Button onClick={() => setLoginOpen(true)} className="w-full">
                          Entrar / Cadastrar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mx-4 my-2 h-px bg-border" />

                  {/* Institucional */}
                  <div className="px-3 pb-3">
                    {([
                      { href: "/sobre", icon: Info, label: "Sobre nós" },
                      { href: "/contato", icon: HeadphonesIcon, label: "Contato" },
                    ] as const).map(({ href, icon: Icon, label }) => (
                      <Link key={href} href={href}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent transition-colors group">
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </span>
                        <span className="text-sm font-medium">{label}</span>
                      </Link>
                    ))}

                    {/* Tema */}
                    <button onClick={toggleTheme}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent transition-colors group">
                      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        {theme === "dark"
                          ? <Sun className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          : <Moon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                      </span>
                      <span className="text-sm font-medium">{theme === "dark" ? "Tema Claro" : "Tema Escuro"}</span>
                    </button>

                    {/* Admin — só para usuários com is_admin no banco */}
                    {currentUser?.isAdmin && (
                      <Link href="/admin"
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-accent transition-colors group opacity-60 hover:opacity-100">
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">Admin</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Footer: Sair / login */}
                {currentUser && (
                  <div className="p-4 border-t border-border bg-muted/20 shrink-0">
                    <Button variant="destructive" onClick={handleLogout} className="w-full gap-2">
                      <LogOut className="w-4 h-4" /> Sair da conta
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Barra de pesquisa mobile — FORA do header para evitar conflito com backdrop-blur */}
      <div className="sm:hidden sticky top-14 z-40 bg-background border-b border-border/40 px-3 py-2">
        <SearchBar mobile />
      </div>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t border-border/40 bg-card mt-auto">
        <div className="container py-14">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-vermotu.png" alt="Vermotu" className="h-10 w-auto object-contain" />
              </div>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-5">
                O maior marketplace de motos, peças, acessórios e serviços do Brasil. Tudo para sua moto em um só lugar.
              </p>
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Formas de pagamento</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 border border-primary/40 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                    <QrCode className="w-3 h-3" /> PIX
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-border text-xs px-2.5 py-1 rounded-full font-medium">
                    <CreditCard className="w-3 h-3" /> Cartão de crédito
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-border text-xs px-2.5 py-1 rounded-full font-medium">
                    <Banknote className="w-3 h-3" /> Boleto
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Pagamentos processados com segurança pelo Stripe
                </p>
              </div>
              <div className="flex gap-2">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-border bg-card hover:border-primary hover:text-primary flex items-center justify-center transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-border bg-card hover:border-primary hover:text-primary flex items-center justify-center transition-colors" aria-label="Facebook">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-border bg-card hover:border-primary hover:text-primary flex items-center justify-center transition-colors" aria-label="YouTube">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href="https://wa.me/5521992963028" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-border bg-card hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center transition-colors" aria-label="WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm">Comprar</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/motos" className="hover:text-primary transition-colors">Motos</Link></li>
                <li><Link href="/pecas" className="hover:text-primary transition-colors">Peças</Link></li>
                <li><Link href="/pecas?cat=capacete" className="hover:text-primary transition-colors">Capacetes</Link></li>
                <li><Link href="/pecas?cat=pneu" className="hover:text-primary transition-colors">Pneus</Link></li>
                <li><Link href="/oficinas" className="hover:text-primary transition-colors">Oficinas</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm">Vender</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/anunciar" className="hover:text-primary transition-colors">Criar anúncio</Link></li>
                <li><Link href="/planos" className="hover:text-primary transition-colors">Planos premium</Link></li>
                <li><Link href="/conta?tab=loja" className="hover:text-primary transition-colors">Painel vendedor</Link></li>
                <li><Link href="/anunciar" className="hover:text-primary transition-colors">Cadastrar oficina</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm">Central de Ajuda</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/contato" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contato" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Fale conosco
                  </Link>
                </li>
                <li>
                  <a href="mailto:suporte@vermotu.com.br" className="hover:text-primary transition-colors">
                    suporte@vermotu.com.br
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/5521992963028" target="_blank" rel="noopener noreferrer"
                    className="hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Suporte
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-sm">Institucional</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/sobre" className="hover:text-primary transition-colors">Sobre nós</Link></li>
                <li>
                  <Link href="/privacidade" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/termos" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Termos de Uso
                  </Link>
                </li>
                <li><Link href="/contato" className="hover:text-primary transition-colors">Contato</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 mt-10 pt-6 flex flex-col md:flex-row gap-3 justify-between text-xs text-muted-foreground">
            <span>
              <span onClick={handleSecretClick} className="cursor-default select-none">&copy;</span>
              {" "}{new Date().getFullYear()} Vermotu Marketplace LTDA — Rio de Janeiro, RJ.
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
              <Link href="/termos" className="hover:text-primary transition-colors">Termos</Link>
              <Link href="/contato" className="hover:text-primary transition-colors">FAQ</Link>
              <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Admin
              </Link>
              <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Feito por motociclistas.</span>
            </div>
          </div>
        </div>
      </footer>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

export function useRequireLogin() {
  const currentUserId = useSession((s) => s.currentUserId);
  const [open, setOpen] = useState(false);
  const dialog = <LoginDialog open={open} onOpenChange={setOpen} />;
  const ensure = (cb?: () => void) => {
    if (currentUserId) {
      cb?.();
      return true;
    }
    setOpen(true);
    return false;
  };
  return { ensure, dialog, currentUserId };
}
