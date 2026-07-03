import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useSession, formatBRL, formatDateBR, imageUrl } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetUser,
  useListItems,
  useListFavorites,
  useListAppointments,
  useUpdateItem,
  useDeleteItem,
  useListOrders,
  useUpdateOrderStatus,
  getListItemsQueryKey,
  getGetUserQueryKey,
  getListFavoritesQueryKey,
  getListAppointmentsQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, CheckCircle2, Heart, Calendar, MessageCircle, Crown, Package, TrendingUp, DollarSign, ShieldCheck, Phone, BadgeCheck } from "lucide-react";
import { formatPhone } from "@/lib/session";
import { toast } from "sonner";

export function Conta() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const queryClient = useQueryClient();

  useEffect(() => { document.title = "Minha conta — MotoHub"; }, []);
  useEffect(() => { if (!currentUserId) setLoginOpen(true); }, [currentUserId, setLoginOpen]);

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });
  const { data: allItems } = useListItems({});
  const { data: favorites } = useListFavorites(
    { userId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListFavoritesQueryKey({ userId: currentUserId ?? 0 }) } },
  );
  const { data: appointments } = useListAppointments(
    { userId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListAppointmentsQueryKey({ userId: currentUserId ?? 0 }) } },
  );

  const myItems = (allItems ?? []).filter((i) => i.sellerId === currentUserId);
  const favItems = (allItems ?? []).filter((i) => (favorites ?? []).includes(i.id));

  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const updateOrderStatus = useUpdateOrderStatus();

  const { data: myOrders } = useListOrders(
    { buyerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListOrdersQueryKey({ buyerId: currentUserId ?? 0 }) } },
  );
  const { data: salesOrders } = useListOrders(
    { sellerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListOrdersQueryKey({ sellerId: currentUserId ?? 0 }) } },
  );

  const totalSales = (salesOrders ?? []).reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0);
  const totalRevenue = totalSales * 0.95;
  const ordersCount = (salesOrders ?? []).length;

  const markSold = (id: number) =>
    updateItem.mutate({ id, data: { status: "sold" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        toast.success("Marcado como vendido");
      },
    });

  const remove = (id: number) =>
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        toast.success("Anúncio removido");
      },
    });

  if (!currentUserId) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Entre para acessar sua conta.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Olá, {user?.name?.split(" ")[0] ?? "—"}</h1>
            <p className="text-muted-foreground">Gerencie seus anúncios, favoritos e mensagens</p>
          </div>
          {user && (
            <Badge variant="outline" className="capitalize gap-1">
              <Crown className="w-3 h-3" /> Plano {user.plan}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="anuncios">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="anuncios">Meus anúncios</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="compras">Minhas compras</TabsTrigger>
            <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="conta">Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="anuncios">
            {myItems.length === 0 ? (
              <Empty title="Você ainda não tem anúncios" cta={<Button asChild><Link href="/anunciar">Criar primeiro anúncio</Link></Button>} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myItems.map((i) => (
                  <Card key={i.id}>
                    <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
                      <img src={imageUrl(i.image)} alt={i.title} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={i.status === "active" ? "default" : "secondary"} className="capitalize">{i.status}</Badge>
                        {i.premium && <Badge variant="outline">Premium</Badge>}
                      </div>
                      <h3 className="font-semibold line-clamp-1">{i.title}</h3>
                      <p className="text-primary font-bold mt-1">{formatBRL(i.price)}</p>
                      <div className="flex gap-2 mt-3">
                        {i.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => markSold(i.id)} className="flex-1">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Vendido
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => remove(i.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vendas">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Package className="w-5 h-5" /></div><div><div className="text-xs text-muted-foreground">Pedidos recebidos</div><div className="text-xl font-bold">{ordersCount}</div></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div><div><div className="text-xs text-muted-foreground">Vendas brutas</div><div className="text-xl font-bold">{formatBRL(totalSales)}</div></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><DollarSign className="w-5 h-5" /></div><div><div className="text-xs text-muted-foreground">Receita líquida (95%)</div><div className="text-xl font-bold">{formatBRL(totalRevenue)}</div></div></CardContent></Card>
            </div>
            {(salesOrders ?? []).length === 0 ? (
              <Empty title="Você ainda não recebeu pedidos" subtitle="Anúncios com peças e acessórios geram vendas automaticamente." />
            ) : (
              <div className="space-y-3">
                {(salesOrders ?? []).map((o) => (
                  <Card key={o.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Pedido #{o.id} · {formatDateBR(o.createdAt)}</div>
                          <div className="font-bold text-primary">{formatBRL(o.total)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{o.status}</Badge>
                          {o.status === "paid" && <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ id: o.id, data: { status: "shipped" } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ sellerId: currentUserId }) }); toast.success("Marcado como enviado"); } })}>Marcar enviado</Button>}
                          {o.status === "shipped" && <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ id: o.id, data: { status: "delivered" } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ sellerId: currentUserId }) }); toast.success("Marcado como entregue"); } })}>Marcar entregue</Button>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {o.items.map((i) => (
                          <div key={i.id} className="flex gap-2 text-sm items-center">
                            <img src={imageUrl(i.image)} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                            <div className="flex-1 min-w-0 line-clamp-1">{i.title}</div>
                            <div className="text-muted-foreground">x{i.qty}</div>
                            <div className="font-medium">{formatBRL(i.price * i.qty)}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compras">
            {(myOrders ?? []).length === 0 ? (
              <Empty title="Sem compras ainda" subtitle="Suas compras aparecem aqui." cta={<Button asChild><Link href="/pedidos">Ver pedidos</Link></Button>} />
            ) : (
              <div className="space-y-3">
                {(myOrders ?? []).map((o) => (
                  <Card key={o.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-xs text-muted-foreground">#{o.id} · {formatDateBR(o.createdAt)}</div>
                          <div className="font-bold text-primary">{formatBRL(o.total)}</div>
                        </div>
                        <Badge variant="outline" className="capitalize">{o.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{o.items.length} item(ns) · {o.paymentMethod.toUpperCase()}</div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" asChild><Link href="/pedidos">Ver detalhes em /pedidos</Link></Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favoritos">
            {favItems.length === 0 ? (
              <Empty title="Você ainda não tem favoritos" subtitle="Explore as motos e clique no coração para salvá-las." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favItems.map((i) => {
                  const section = i.type === "moto" ? "motos" : i.type === "peca" ? "pecas" : "servicos";
                  return (
                    <Link key={i.id} href={`/${section}/${i.id}`}>
                      <Card className="hover:border-primary/50 transition-colors">
                        <div className="aspect-[4/3] overflow-hidden rounded-t-xl">
                          <img src={imageUrl(i.image)} alt={i.title} className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold line-clamp-1">{i.title}</h3>
                          <p className="text-primary font-bold mt-1">{formatBRL(i.price)}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agendamentos">
            {(appointments ?? []).length === 0 ? (
              <Empty title="Sem agendamentos" subtitle="Agende um serviço em nossa rede de oficinas." cta={<Button asChild><Link href="/servicos">Ver serviços</Link></Button>} />
            ) : (
              <div className="space-y-3">
                {appointments!.map((a) => {
                  const svc = (allItems ?? []).find((i) => i.id === a.serviceId);
                  return (
                    <Card key={a.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-primary" />
                          <div>
                            <div className="font-semibold">{svc?.title ?? `Serviço #${a.serviceId}`}</div>
                            <div className="text-sm text-muted-foreground">{formatDateBR(a.date)}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">{a.status}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conta">
            <Card>
              <CardHeader>
                <CardTitle>Informações da conta</CardTitle>
                <CardDescription>Seus dados cadastrais e verificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">Nome</div>
                    <div className="font-medium">{user?.name ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">E-mail</div>
                    <div className="font-medium break-all">{user?.email ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</div>
                    <div className="font-medium">{user?.phone ? formatPhone(user.phone) : <span className="text-muted-foreground italic">não cadastrado</span>}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="text-xs text-muted-foreground">CPF</div>
                    <div className="font-medium">
                      {user?.cpf ? (
                        <span className="inline-flex items-center gap-1">
                          •••.•••.{user.cpf.slice(6, 9)}-{user.cpf.slice(9, 11)}
                          <BadgeCheck className="w-4 h-4 text-primary" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">não cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize gap-1">
                    <Crown className="w-3 h-3" /> Plano {user?.plan ?? "—"}
                  </Badge>
                  {user?.accountVerified && (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                      <ShieldCheck className="w-3 h-3" /> Conta verificada
                    </Badge>
                  )}
                  {user?.phoneVerified && (
                    <Badge className="gap-1 bg-emerald-600/15 text-emerald-500 hover:bg-emerald-600/15">
                      <Phone className="w-3 h-3" /> Telefone verificado
                    </Badge>
                  )}
                  {user?.cpf && (
                    <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                      <BadgeCheck className="w-3 h-3" /> CPF validado
                    </Badge>
                  )}
                </div>

                <div className="pt-3 flex flex-wrap gap-2">
                  <Button asChild><Link href="/planos">Mudar plano</Link></Button>
                  <Button variant="outline" asChild><Link href="/chat"><MessageCircle className="w-4 h-4 mr-2" />Mensagens</Link></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </Layout>
  );
}

function Empty({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <Heart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
