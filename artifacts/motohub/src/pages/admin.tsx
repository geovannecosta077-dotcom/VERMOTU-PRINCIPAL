import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSession, formatBRL, formatDateBR, imageUrl } from "@/lib/session";
import {
  useGetAdminStats,
  useListUsers,
  useUpdateItem,
  useDeleteItem,
  useUpdateUser,
  useListCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useListAdminLogs,
  useListAdminReports,
  useUpdateAdminReport,
  useDeleteAdminReport,
  useCreateAdminLog,
  useGetUser,
  useListAdminSubscriptions,
  useAdminUpdateSubscription,
  useAdminListBlogPosts,
  useAdminCreateBlogPost,
  useAdminUpdateBlogPost,
  useAdminDeleteBlogPost,
  useAdminSendEmail,
  useAdminListEmailCampaigns,
  useAdminListBanners,
  useAdminCreateBanner,
  useAdminUpdateBanner,
  useAdminDeleteBanner,
  useSignIn,
  getGetAdminStatsQueryKey,
  getListUsersQueryKey,
  getListCouponsQueryKey,
  getListAdminLogsQueryKey,
  getListAdminReportsQueryKey,
  getGetUserQueryKey,
  getListAdminSubscriptionsQueryKey,
  getAdminListBlogPostsQueryKey,
  getAdminListEmailCampaignsQueryKey,
  getAdminListBannersQueryKey,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  LayoutDashboard, Package, Users, Tag, DollarSign, ShoppingBag,
  TrendingUp, Trash2, CheckCircle2, XCircle, Ban, Shield, Plus, PlusCircle,
  LogOut, Search, Star, CalendarCheck, Activity, ChevronRight,
  BadgeCheck, Crown, AlertTriangle, Eye, EyeOff, Settings, Flag,
  Clock, FileText, CheckCheck, X, RefreshCw, CreditCard, Image, ArrowUp, ArrowDown, Menu,
} from "lucide-react";

const PIE_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#6366f1", "#ef4444"];

type Tab = "dashboard" | "items" | "users" | "orders" | "coupons" | "finance" | "reports" | "logs" | "settings" | "pagamentos" | "blog" | "email" | "banners";

const REPORT_REASONS = [
  "Conteúdo impróprio ou ofensivo",
  "Anúncio fraudulento ou enganoso",
  "Produto proibido ou ilegal",
  "Spam ou anúncio duplicado",
  "Informações incorretas",
  "Outro",
];

export function Admin() {
  const { adminUnlocked, setAdminUnlocked, currentUserId, setCurrentUserId } = useSession();
  const [, setLocation] = useLocation();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const signIn = useSignIn();
  const [userSearch, setUserSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "", minOrder: "" });
  const queryClient = useQueryClient();

  useEffect(() => { document.title = "Admin — Vermotu"; }, []);

  const { data: currentUserData } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });
  useEffect(() => {
    if (currentUserData?.isAdmin && !adminUnlocked) {
      setAdminUnlocked(true);
    }
  }, [currentUserData?.isAdmin, adminUnlocked, setAdminUnlocked]);

  const enabled = adminUnlocked;
  const { data: stats } = useGetAdminStats({ query: { enabled, queryKey: getGetAdminStatsQueryKey() } });
  const { data: items, refetch: refetchItems } = useQuery<{ id: number; type: string; title: string; price: number; status: string; sellerId: number; premium: boolean; image: string; createdAt: string; location: string; category: string; brand: string | null; condition: string; ratingAvg: number; ratingCount: number; stock: number }[]>({
    queryKey: ["admin-items-all"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/admin/items");
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
  const { data: users } = useListUsers({ query: { enabled, queryKey: getListUsersQueryKey() } });
  const { data: coupons } = useListCoupons({ query: { enabled, queryKey: getListCouponsQueryKey() } });
  const { data: adminLogs } = useListAdminLogs({ query: { enabled, queryKey: getListAdminLogsQueryKey() } });
  const { data: adminReports, refetch: refetchReports } = useListAdminReports({ query: { enabled, queryKey: getListAdminReportsQueryKey() } });
  const { data: adminSubscriptions } = useListAdminSubscriptions({ query: { enabled, queryKey: getListAdminSubscriptionsQueryKey() } });
  const adminUpdateSubscription = useAdminUpdateSubscription();
  const { data: blogPosts, refetch: refetchBlog } = useAdminListBlogPosts({ query: { enabled, queryKey: getAdminListBlogPostsQueryKey() } });
  const createBlogPost = useAdminCreateBlogPost();
  const updateBlogPost = useAdminUpdateBlogPost();
  const deleteBlogPost = useAdminDeleteBlogPost();
  const sendEmail = useAdminSendEmail();
  const { data: emailCampaigns, refetch: refetchEmailCampaigns } = useAdminListEmailCampaigns({ query: { enabled, queryKey: getAdminListEmailCampaignsQueryKey() } });
  const { data: adminBanners, refetch: refetchBanners } = useAdminListBanners({ query: { enabled, queryKey: getAdminListBannersQueryKey() } });
  const createBanner = useAdminCreateBanner();
  const updateBanner = useAdminUpdateBanner();
  const deleteBanner = useAdminDeleteBanner();

  const [blogForm, setBlogForm] = useState({ title: "", slug: "", excerpt: "", category: "Segurança", content: "", coverImageUrl: "", seoTitle: "", seoDescription: "", published: false });
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [blogView, setBlogView] = useState<"list" | "form">("list");
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", targetFilter: "all" });
  const BANNER_BLANK = { title: "", subtitle: "", ctaText: "", ctaUrl: "/", imageUrl: "", bgColor: "#dc2626", order: 0, active: true, durationSecs: 6, startsAt: "", endsAt: "" };
  const [bannerForm, setBannerForm] = useState(BANNER_BLANK);
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const [bannerView, setBannerView] = useState<"list" | "form">("list");

  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const updateUser = useUpdateUser();
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const updateReport = useUpdateAdminReport();
  const deleteReport = useDeleteAdminReport();
  const createLog = useCreateAdminLog();

  const logAction = (action: string, target: string, details = "") => {
    if (!currentUserId) return;
    const admin = users?.find((u) => u.id === currentUserId);
    createLog.mutate({
      data: {
        adminId: currentUserId,
        adminName: admin?.name ?? "Admin",
        action,
        target,
        details,
      },
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminLogsQueryKey() }),
    });
  };

  const tryAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoginLoading(true);
    try {
      const user = await signIn.mutateAsync({ data: { email: loginEmail.trim(), password: loginPassword } });
      if (!user.isAdmin) {
        toast.error("Essa conta não tem permissão de administrador.");
        return;
      }
      setCurrentUserId(user.id);
      setAdminUnlocked(true);
      toast.success(`Bem-vindo ao painel, ${user.name.split(" ")[0]}!`);
    } catch (err: unknown) {
      const obj = err as { data?: { error?: string }; message?: string };
      const msg = obj?.data?.error || obj?.message || "E-mail ou senha incorretos.";
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => { setAdminUnlocked(false); setLocation("/"); };

  const banUser = (id: number, banned: boolean) =>
    updateUser.mutate({ id, data: { banned } }, {
      onSuccess: (u) => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success(banned ? "Usuário suspenso" : "Usuário reativado");
        logAction(banned ? "Suspender usuário" : "Reativar usuário", `Usuário #${id} — ${u.name}`);
      },
    });

  const verifyUser = (id: number, verified: boolean) =>
    updateUser.mutate({ id, data: { accountVerified: verified } }, {
      onSuccess: (u) => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success(verified ? "Conta verificada" : "Verificação removida");
        logAction(verified ? "Verificar conta" : "Remover verificação", `Usuário #${id} — ${u.name}`);
      },
    });

  const promoteAdmin = (id: number, isAdmin: boolean) =>
    updateUser.mutate({ id, data: { isAdmin } }, {
      onSuccess: (u) => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success(isAdmin ? "Usuário promovido a admin" : "Admin removido");
        logAction(isAdmin ? "Promover a admin" : "Remover admin", `Usuário #${id} — ${u.name}`);
      },
    });

  const changeUserPlan = (id: number, plan: "free" | "pro" | "premium") =>
    updateUser.mutate({ id, data: { plan } }, {
      onSuccess: (u) => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success(`Plano alterado para ${plan}`);
        logAction("Alterar plano", `Usuário #${id} — ${u.name}`, `Novo plano: ${plan}`);
      },
    });

  const setItemStatus = (id: number, status: "active" | "pending") =>
    updateItem.mutate({ id, data: { status } }, {
      onSuccess: (item) => {
        refetchItems();
        toast.success(status === "active" ? "Anúncio aprovado" : "Anúncio suspenso");
        logAction(status === "active" ? "Aprovar anúncio" : "Suspender anúncio", `Item #${id} — ${item.title}`);
      },
    });

  const featureItem = (id: number, premium: boolean) =>
    updateItem.mutate({ id, data: { premium } }, {
      onSuccess: (item) => {
        refetchItems();
        toast.success(premium ? "Anúncio destacado" : "Destaque removido");
        logAction(premium ? "Destacar anúncio" : "Remover destaque", `Item #${id} — ${item.title}`);
      },
    });

  const removeItem = (id: number) => {
    const item = items?.find((i) => i.id === id);
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        refetchItems();
        toast.success("Anúncio removido");
        logAction("Remover anúncio", `Item #${id} — ${item?.title ?? ""}`);
      },
    });
  };

  const addCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.value) return;
    createCoupon.mutate(
      { data: { code: newCoupon.code.toUpperCase(), type: newCoupon.type, value: Number(newCoupon.value), minOrder: newCoupon.minOrder ? Number(newCoupon.minOrder) : null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
          toast.success("Cupom criado");
          logAction("Criar cupom", newCoupon.code.toUpperCase());
          setNewCoupon({ code: "", type: "percent", value: "", minOrder: "" });
        },
        onError: () => toast.error("Não foi possível criar o cupom"),
      },
    );
  };

  const removeCoupon = (id: number) =>
    deleteCoupon.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
        toast.success("Cupom removido");
        logAction("Remover cupom", `Cupom #${id}`);
      },
    });

  const resolveReport = (id: number) =>
    updateReport.mutate({ id, data: { status: "resolved" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast.success("Denúncia resolvida");
        logAction("Resolver denúncia", `Denúncia #${id}`);
      },
    });

  const dismissReport = (id: number) =>
    updateReport.mutate({ id, data: { status: "dismissed" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast.success("Denúncia arquivada");
        logAction("Arquivar denúncia", `Denúncia #${id}`);
      },
    });

  const removeReport = (id: number) =>
    deleteReport.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast.success("Denúncia excluída");
      },
    });

  const filteredUsers = (users ?? []).filter((u) =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );
  const filteredItems = (items ?? []).filter((i) =>
    !itemSearch || i.title.toLowerCase().includes(itemSearch.toLowerCase()) || (i.brand ?? "").toLowerCase().includes(itemSearch.toLowerCase()),
  );
  const filteredLogs = (adminLogs ?? []).filter((l) =>
    !logSearch || l.action.toLowerCase().includes(logSearch.toLowerCase()) || l.target.toLowerCase().includes(logSearch.toLowerCase()) || l.adminName.toLowerCase().includes(logSearch.toLowerCase()),
  );

  const categoryData = (stats?.itemsByCategory ?? []).map((r) => ({
    name: r.category === "moto" ? "Motos" : r.category === "peca" ? "Peças" : r.category === "servico" ? "Serviços" : r.category,
    count: r.count,
  }));
  const dayData = (stats?.newUsersByDay ?? []).map((r) => ({ day: r.day.slice(5), users: r.count }));
  const planData = (stats?.planCount ?? []).map((r) => ({ name: r.plan, value: r.count }));

  const pendingReports = (stats as { pendingReports?: number } | undefined)?.pendingReports ?? 0;
  const pendingPayments = (adminSubscriptions ?? []).filter((s) => s.status === "proof_submitted").length;

  const approveSubscription = (id: number, userId: number, plan: string) =>
    adminUpdateSubscription.mutate(
      { id, data: { status: "approved", approvedBy: currentUserId ?? 0 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminSubscriptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast.success("Assinatura aprovada! Plano ativado.");
          logAction("Aprovar assinatura", `Usuário #${userId} — Plano ${plan}`);
        },
        onError: () => toast.error("Erro ao aprovar assinatura."),
      },
    );

  const rejectSubscription = (id: number, userId: number) =>
    adminUpdateSubscription.mutate(
      { id, data: { status: "rejected" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminSubscriptionsQueryKey() });
          toast.success("Assinatura rejeitada.");
          logAction("Rejeitar assinatura", `Usuário #${userId}`);
        },
        onError: () => toast.error("Erro ao rejeitar assinatura."),
      },
    );

  if (!adminUnlocked) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Área Administrativa</h1>
            <p className="text-sm text-muted-foreground">Acesso exclusivo para administradores e funcionários Vermotu</p>
          </div>
          <form onSubmit={tryAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Senha</Label>
              <div className="relative">
                <Input
                  id="admin-pass"
                  type={showPass ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loginLoading}>
              {loginLoading ? "Verificando..." : "Acessar painel"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/")}>
              Voltar ao site
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "items", label: "Anúncios", icon: Package, badge: stats?.pendingItems },
    { id: "users", label: "Usuários", icon: Users },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "finance", label: "Financeiro", icon: DollarSign },
    { id: "reports", label: "Denúncias", icon: Flag, badge: pendingReports },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard, badge: pendingPayments || undefined },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "banners", label: "Banners", icon: Image },
    { id: "email", label: "E-mail em Massa", icon: CheckCheck },
    { id: "logs", label: "Logs", icon: Activity },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="dark min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none">Vermotu</div>
              <div className="text-xs text-muted-foreground">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge != null && badge > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] bg-destructive text-white">{badge}</Badge>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setLocation("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Activity className="w-4 h-4" />
            Ver site
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl">

          {/* ─── DASHBOARD ─── */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm">Visão geral do marketplace</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={Package} label="Anúncios ativos" value={stats?.activeItems ?? 0} sub={`${stats?.pendingItems ?? 0} pendentes`} warn={(stats?.pendingItems ?? 0) > 0} />
                <KpiCard icon={Users} label="Usuários" value={stats?.totalUsers ?? 0} sub={`${stats?.verifiedUsers ?? 0} verificados`} />
                <KpiCard icon={ShoppingBag} label="Pedidos" value={stats?.totalOrders ?? 0} />
                <KpiCard icon={CalendarCheck} label="Agendamentos" value={stats?.totalAppointments ?? 0} />
                <KpiCard icon={TrendingUp} label="GMV" value={formatBRL(stats?.gmv ?? 0)} />
                <KpiCard icon={DollarSign} label="Comissão (5%)" value={formatBRL(stats?.commission ?? 0)} accent />
                <KpiCard icon={Crown} label="Receita assinat." value={formatBRL(stats?.subscriptionRevenue ?? 0)} accent />
                <KpiCard icon={Flag} label="Denúncias pendentes" value={pendingReports} warn={pendingReports > 0} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader><CardTitle className="text-base">Anúncios por categoria</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Novos usuários por dia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={dayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Distribuição de planos</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Saúde da plataforma</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <HealthRow label="Usuários totais" value={stats?.totalUsers ?? 0} max={500} />
                    <HealthRow label="Verificados" value={stats?.verifiedUsers ?? 0} max={stats?.totalUsers ?? 1} color="emerald" />
                    <HealthRow label="Anúncios ativos" value={stats?.activeItems ?? 0} max={stats?.totalItems ?? 1} />
                    <HealthRow label="Pendentes aprovação" value={stats?.pendingItems ?? 0} max={stats?.totalItems ?? 1} color="amber" />
                    {(stats?.bannedUsers ?? 0) > 0 && (
                      <HealthRow label="Usuários suspensos" value={stats?.bannedUsers ?? 0} max={stats?.totalUsers ?? 1} color="red" />
                    )}
                    {pendingReports > 0 && (
                      <HealthRow label="Denúncias pendentes" value={pendingReports} max={20} color="red" />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ─── ANÚNCIOS ─── */}
          {activeTab === "items" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Anúncios</h1>
                <Badge variant="outline">{filteredItems.length} total</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por título ou marca..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
              </div>
              <Card>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Foto</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Destaque</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>
                            <img src={imageUrl(i.image)} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px]">
                            <div className="line-clamp-1">{i.title}</div>
                            {i.brand && <div className="text-xs text-muted-foreground">{i.brand}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{i.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{formatBRL(i.price)}</TableCell>
                          <TableCell>
                            <Badge variant={i.status === "active" ? "default" : i.status === "pending" ? "secondary" : "outline"} className="capitalize text-xs">{i.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {i.premium ? <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Destaque</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {i.status !== "active" && (
                                <Button size="sm" variant="outline" onClick={() => setItemStatus(i.id, "active")} title="Aprovar">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {i.status !== "pending" && (
                                <Button size="sm" variant="outline" onClick={() => setItemStatus(i.id, "pending")} title="Suspender">
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant={i.premium ? "secondary" : "outline"} onClick={() => featureItem(i.id, !i.premium)} title={i.premium ? "Remover destaque" : "Destacar"}>
                                <Star className={`w-3.5 h-3.5 ${i.premium ? "fill-current" : ""}`} />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeItem(i.id)} title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhum anúncio encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── USUÁRIOS ─── */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Usuários</h1>
                <Badge variant="outline">{filteredUsers.length} total</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              </div>
              <Card>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plano rápido</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id} className={u.banned ? "opacity-50" : ""}>
                          <TableCell>
                            <div className="font-medium flex items-center gap-1.5">
                              {u.name}
                              {u.isAdmin && <Shield className="w-3.5 h-3.5 text-primary" />}
                              {u.accountVerified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">{u.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            {u.cpf ? <BadgeCheck className="w-4 h-4 text-emerald-500" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{u.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            {u.banned ? <Badge variant="destructive" className="text-xs">Suspenso</Badge> :
                              u.isAdmin ? <Badge className="text-xs">Admin</Badge> :
                              u.accountVerified ? <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-500">Verificado</Badge> :
                              <Badge variant="secondary" className="text-xs">Ativo</Badge>}
                          </TableCell>
                          <TableCell>
                            <Select value={u.plan} onValueChange={(v) => changeUserPlan(u.id, v as "free" | "pro" | "premium")}>
                              <SelectTrigger className="h-7 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant={u.accountVerified ? "secondary" : "outline"} onClick={() => verifyUser(u.id, !u.accountVerified)} title={u.accountVerified ? "Remover verificação" : "Verificar conta"}>
                                <BadgeCheck className={`w-3.5 h-3.5 ${u.accountVerified ? "text-emerald-500" : ""}`} />
                              </Button>
                              <Button size="sm" variant={u.isAdmin ? "secondary" : "outline"} onClick={() => promoteAdmin(u.id, !u.isAdmin)} title={u.isAdmin ? "Remover admin" : "Promover a admin"}>
                                <Shield className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant={u.banned ? "outline" : "destructive"} onClick={() => banUser(u.id, !u.banned)} title={u.banned ? "Reativar" : "Suspender"}>
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhum usuário encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── PEDIDOS ─── */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Pedidos</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                {(stats?.ordersByStatus ?? []).map((s) => (
                  <Card key={s.status}>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground capitalize mb-1">{s.status}</div>
                      <div className="text-2xl font-bold">{s.count}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{stats?.totalOrders ?? 0} pedidos no sistema</p>
                  <p className="text-sm mt-1">Detalhes por usuário disponíveis em cada perfil.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── CUPONS ─── */}
          {activeTab === "coupons" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold">Cupons de desconto</h1>
              <Card>
                <CardHeader><CardTitle className="text-base">Criar cupom</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={addCoupon} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Código</Label>
                      <Input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="PROMO20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newCoupon.type} onValueChange={(v) => setNewCoupon({ ...newCoupon, type: v as "percent" | "fixed" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor</Label>
                      <Input type="number" step="0.01" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} placeholder="10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pedido mínimo</Label>
                      <Input type="number" step="0.01" value={newCoupon.minOrder} onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: e.target.value })} placeholder="Opcional" />
                    </div>
                    <Button type="submit" disabled={createCoupon.isPending}>
                      <Plus className="w-4 h-4 mr-1" /> Criar
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Cupons cadastrados</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Pedido mínimo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(coupons ?? []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                          <TableCell className="capitalize text-sm">{c.type === "percent" ? "Percentual" : "Fixo"}</TableCell>
                          <TableCell>{c.type === "percent" ? `${c.value}%` : formatBRL(c.value)}</TableCell>
                          <TableCell>{c.minOrder ? formatBRL(c.minOrder) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={c.active ? "default" : "secondary"} className="capitalize text-xs">{c.active ? "Ativo" : "Inativo"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="destructive" onClick={() => removeCoupon(c.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(coupons ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cupom cadastrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── FINANCEIRO ─── */}
          {activeTab === "finance" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold">Financeiro</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={TrendingUp} label="GMV total" value={formatBRL(stats?.gmv ?? 0)} />
                <KpiCard icon={DollarSign} label="Comissão (5% GMV)" value={formatBRL(stats?.commission ?? 0)} accent />
                <KpiCard icon={Crown} label="Receita de assinaturas" value={formatBRL(stats?.subscriptionRevenue ?? 0)} accent />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Resumo financeiro</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <FinRow label="Volume transacionado (GMV)" value={formatBRL(stats?.gmv ?? 0)} />
                  <FinRow label="Comissão sobre vendas (5%)" value={formatBRL(stats?.commission ?? 0)} />
                  <FinRow label="Assinaturas Pro (R$ 49,90/mês)" value={`${(stats?.planCount ?? []).find((p) => p.plan === "pro")?.count ?? 0} usuários`} />
                  <FinRow label="Assinaturas Premium (R$ 99,90/mês)" value={`${(stats?.planCount ?? []).find((p) => p.plan === "premium")?.count ?? 0} usuários`} />
                  <FinRow label="Receita total de assinaturas" value={formatBRL(stats?.subscriptionRevenue ?? 0)} />
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Receita total estimada</span>
                      <span className="text-xl font-black text-primary">{formatBRL((stats?.commission ?? 0) + (stats?.subscriptionRevenue ?? 0))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── DENÚNCIAS ─── */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Denúncias</h1>
                  <p className="text-sm text-muted-foreground">Gestão de conteúdo impróprio e fraudes reportadas</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                    {(adminReports ?? []).filter((r) => r.status === "pending").length} pendentes
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => refetchReports()}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">{(adminReports ?? []).filter((r) => r.status === "pending").length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Pendentes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-500">{(adminReports ?? []).filter((r) => r.status === "resolved").length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Resolvidas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{(adminReports ?? []).filter((r) => r.status === "dismissed").length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Arquivadas</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Alvo</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(adminReports ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="text-sm font-medium line-clamp-2">{r.reason}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{r.targetType} #{r.targetId}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <div className="text-xs text-muted-foreground line-clamp-2">{r.details || "—"}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={r.status === "pending" ? "secondary" : r.status === "resolved" ? "default" : "outline"}
                              className={`text-xs capitalize ${r.status === "pending" ? "bg-amber-500/15 text-amber-500" : r.status === "resolved" ? "bg-emerald-500/15 text-emerald-500" : ""}`}
                            >
                              {r.status === "pending" ? "Pendente" : r.status === "resolved" ? "Resolvida" : "Arquivada"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateBR(r.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {r.status === "pending" && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => resolveReport(r.id)} title="Resolver">
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => dismissReport(r.id)} title="Arquivar">
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => removeReport(r.id)} title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(adminReports ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                            <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Nenhuma denúncia registrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── LOGS ─── */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Log de atividades</h1>
                  <p className="text-sm text-muted-foreground">Registro de todas as ações administrativas</p>
                </div>
                <Badge variant="outline">{filteredLogs.length} registros</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por ação, alvo ou admin..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
              </div>
              <Card>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Alvo</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {formatDateBR(l.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <Shield className="w-3 h-3 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{l.adminName || "Admin"}</div>
                                <div className="text-xs text-muted-foreground">ID #{l.adminId}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{l.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]">
                            <div className="line-clamp-1">{l.target || "—"}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px]">
                            <div className="line-clamp-1">{l.details || "—"}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {logSearch ? "Nenhum log encontrado para este filtro" : "Nenhuma atividade registrada ainda"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── CONFIGURAÇÕES ─── */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-sm text-muted-foreground">Configurações gerais da plataforma Vermotu</p>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Acesso administrativo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow
                    label="Senha do painel admin"
                    description="Use uma senha forte e única para proteger o acesso."
                    value="••••••••••••••• (configurada)"
                  />
                  <SettingRow
                    label="URL do painel"
                    description="Acesse em qualquer momento pelo rodapé do site."
                    value="/admin"
                  />
                  <SettingRow
                    label="Log de atividades"
                    description="Todas as ações do painel são registradas automaticamente."
                    value="Ativo"
                    highlight
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Anúncios</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow
                    label="Aprovação automática"
                    description="Novos anúncios são publicados imediatamente (status 'active')."
                    value="Ativado"
                    highlight
                  />
                  <SettingRow
                    label="Destaque premium"
                    description="Anúncios podem ser destacados manualmente no painel admin."
                    value="Disponível"
                  />
                  <SettingRow
                    label="Máx. anúncios por usuário"
                    description="Plano Free: 3 | Pro: 20 | Premium: ilimitado"
                    value="Por plano"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Planos e receita</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Plano Free" description="Acesso básico ao marketplace" value="Gratuito" />
                  <SettingRow label="Plano Pro" description="Mais anúncios, destaque e analytics" value="R$ 49,90/mês" highlight />
                  <SettingRow label="Plano Premium" description="Recursos ilimitados + suporte prioritário" value="R$ 99,90/mês" highlight />
                  <SettingRow label="Comissão sobre vendas" description="Taxa cobrada sobre o GMV gerado" value="5%" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Segurança</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Proteção brute force" description="Conta bloqueada após 5 tentativas incorretas de login" value="Ativo ✓" highlight />
                  <SettingRow label="Bloqueio temporário" description="Duração do bloqueio por excesso de tentativas" value="15 minutos" />
                  <SettingRow label="Hash de senhas" description="Algoritmo utilizado para armazenamento seguro" value="bcrypt (cost 10)" highlight />
                  <SettingRow label="Validação de entrada" description="Todos os dados são validados com Zod antes de processar" value="Ativo ✓" highlight />
                  <SettingRow label="Sanitização SQL" description="Queries parametrizadas via Drizzle ORM" value="Protegido ✓" highlight />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Estatísticas atuais</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <SettingRow label="Total de usuários" value={String(stats?.totalUsers ?? 0)} />
                  <SettingRow label="Usuários verificados" value={String(stats?.verifiedUsers ?? 0)} highlight />
                  <SettingRow label="Total de anúncios" value={String(stats?.totalItems ?? 0)} />
                  <SettingRow label="Anúncios ativos" value={String(stats?.activeItems ?? 0)} highlight />
                  <SettingRow label="Total de pedidos" value={String(stats?.totalOrders ?? 0)} />
                  <SettingRow label="Mensagens trocadas" value={String(stats?.totalMessages ?? 0)} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── PAGAMENTOS ─── */}
          {activeTab === "pagamentos" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Pagamentos</h1>
                <p className="text-muted-foreground text-sm">Gerencie assinaturas e comprovantes de pagamento PIX</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Aguardando análise</div>
                    <div className="text-2xl font-bold text-amber-500">{(adminSubscriptions ?? []).filter((s) => s.status === "proof_submitted").length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Aprovados</div>
                    <div className="text-2xl font-bold text-emerald-500">{(adminSubscriptions ?? []).filter((s) => s.status === "approved").length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total</div>
                    <div className="text-2xl font-bold">{(adminSubscriptions ?? []).length}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Solicitações de assinatura</CardTitle></CardHeader>
                <CardContent>
                  {(adminSubscriptions ?? []).length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">Nenhuma solicitação de assinatura ainda.</div>
                  ) : (
                    <div className="space-y-4">
                      {(adminSubscriptions ?? []).map((sub) => {
                        const statusMap: Record<string, { label: string; className: string }> = {
                          awaiting_payment: { label: "Aguardando pagamento", className: "bg-amber-500/15 text-amber-500" },
                          proof_submitted: { label: "Comprovante enviado", className: "bg-blue-500/15 text-blue-500" },
                          in_review: { label: "Em análise", className: "bg-purple-500/15 text-purple-500" },
                          approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-500" },
                          rejected: { label: "Rejeitado", className: "bg-red-500/15 text-red-500" },
                          expired: { label: "Expirado", className: "bg-gray-500/15 text-gray-500" },
                        };
                        const st = statusMap[sub.status] ?? { label: sub.status, className: "bg-muted text-muted-foreground" };
                        return (
                          <div key={sub.id} className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold">{sub.userName ?? `Usuário #${sub.userId}`}</div>
                                <div className="text-xs text-muted-foreground">{sub.userEmail}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className={`text-xs ${st.className}`}>{st.label}</Badge>
                                <span className="text-sm font-bold">
                                  {sub.plan === "pro" ? "Básico" : "Premium"} — R$ {sub.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Solicitado em {formatDateBR(sub.createdAt)}
                              {sub.expiresAt && ` · Expira em ${formatDateBR(sub.expiresAt)}`}
                            </div>

                            {sub.proofUrl && (
                              <div className="flex items-center gap-2">
                                <a
                                  href={imageUrl(sub.proofUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ver comprovante
                                </a>
                                <span className="text-xs text-muted-foreground">{sub.proofName}</span>
                              </div>
                            )}

                            {sub.adminNote && (
                              <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                                <span className="font-medium">Nota admin:</span> {sub.adminNote}
                              </div>
                            )}

                            {["proof_submitted", "in_review", "awaiting_payment"].includes(sub.status) && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => approveSubscription(sub.id, sub.userId, sub.plan)}
                                  disabled={adminUpdateSubscription.isPending}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectSubscription(sub.id, sub.userId)}
                                  disabled={adminUpdateSubscription.isPending}
                                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── BLOG ─── */}
          {activeTab === "blog" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Blog</h1>
                  <p className="text-muted-foreground text-sm">Gerencie artigos, categorias e SEO do blog</p>
                </div>
                <Button onClick={() => { setEditingPostId(null); setBlogForm({ title: "", slug: "", excerpt: "", category: "Segurança", content: "", coverImageUrl: "", seoTitle: "", seoDescription: "", published: false }); setBlogView("form"); }}>
                  <PlusCircle className="w-4 h-4 mr-2" />Novo artigo
                </Button>
              </div>

              {blogView === "form" && (
                <Card>
                  <CardHeader><CardTitle>{editingPostId ? "Editar artigo" : "Criar novo artigo"}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Título</Label>
                        <Input value={blogForm.title} onChange={(e) => {
                          const t = e.target.value;
                          const slug = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
                          setBlogForm((f) => ({ ...f, title: t, slug: editingPostId ? f.slug : slug }));
                        }} placeholder="Título do artigo" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Slug (URL)</Label>
                        <Input value={blogForm.slug} onChange={(e) => setBlogForm((f) => ({ ...f, slug: e.target.value }))} placeholder="meu-artigo-sobre-seguranca" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Categoria</Label>
                        <select value={blogForm.category} onChange={(e) => setBlogForm((f) => ({ ...f, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                          {["Segurança", "Manutenção", "Legislação", "Dicas", "Novidades", "Análises", "Customização", "Tecnologia", "Mercado", "Geral"].map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>URL da imagem de capa</Label>
                        <Input value={blogForm.coverImageUrl} onChange={(e) => setBlogForm((f) => ({ ...f, coverImageUrl: e.target.value }))} placeholder="https://exemplo.com/imagem.jpg" />
                        {blogForm.coverImageUrl && (
                          <div className="mt-2 h-36 rounded-lg overflow-hidden border border-border">
                            <img src={blogForm.coverImageUrl} alt="Preview da capa" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Resumo (excerpt)</Label>
                      <Input value={blogForm.excerpt} onChange={(e) => setBlogForm((f) => ({ ...f, excerpt: e.target.value }))} placeholder="Breve descrição do artigo (aparece na listagem)" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <Label>Conteúdo</Label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{blogForm.content.split(/\s+/).filter(Boolean).length} palavras · ~{Math.ceil(blogForm.content.split(/\s+/).filter(Boolean).length / 200)} min leitura</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const url = prompt("URL da imagem a inserir:");
                              if (!url) return;
                              const alt = prompt("Texto alternativo (opcional):") ?? "";
                              setBlogForm((f) => ({ ...f, content: f.content + `\n\n![${alt}](${url})\n` }));
                            }}
                          >
                            <Image className="w-3.5 h-3.5 mr-1" /> Inserir imagem
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5">Suporta Markdown: # Título, ## Subtítulo, - lista, **negrito**, *itálico*, [link](url), ![img](url)</p>
                      <textarea
                        rows={14}
                        value={blogForm.content}
                        onChange={(e) => setBlogForm((f) => ({ ...f, content: e.target.value }))}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono resize-y"
                        placeholder={"## Introdução\n\nEscreva o conteúdo do artigo aqui...\n\n## Seção 2\n\nContinue aqui."}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>SEO Title <span className="text-muted-foreground text-xs">({blogForm.seoTitle.length}/60)</span></Label>
                        <Input maxLength={60} value={blogForm.seoTitle} onChange={(e) => setBlogForm((f) => ({ ...f, seoTitle: e.target.value }))} placeholder="Título para SEO (máx 60 chars)" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>SEO Description <span className="text-muted-foreground text-xs">({blogForm.seoDescription.length}/160)</span></Label>
                        <Input maxLength={160} value={blogForm.seoDescription} onChange={(e) => setBlogForm((f) => ({ ...f, seoDescription: e.target.value }))} placeholder="Descrição para SEO (máx 160 chars)" />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={blogForm.published} onChange={(e) => setBlogForm((f) => ({ ...f, published: e.target.checked }))} className="accent-primary w-4 h-4" />
                        <span className="text-sm font-medium">Publicar imediatamente</span>
                      </label>
                      {!blogForm.published && <span className="text-xs text-muted-foreground">Salvo como rascunho</span>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={async () => {
                        if (!blogForm.title || !blogForm.content) { toast.error("Título e conteúdo são obrigatórios."); return; }
                        try {
                          if (editingPostId) {
                            await updateBlogPost.mutateAsync({ id: editingPostId, data: { ...blogForm, coverImageUrl: blogForm.coverImageUrl || null } });
                            toast.success("Artigo atualizado!");
                          } else {
                            await createBlogPost.mutateAsync({ data: { ...blogForm, authorId: currentUserId ?? 1, authorName: "Admin Vermotu", coverImageUrl: blogForm.coverImageUrl || null } });
                            toast.success("Artigo criado!");
                          }
                          setBlogView("list");
                          refetchBlog();
                        } catch { toast.error("Erro ao salvar artigo."); }
                      }} disabled={createBlogPost.isPending || updateBlogPost.isPending}>
                        {createBlogPost.isPending || updateBlogPost.isPending ? "Salvando..." : "Salvar artigo"}
                      </Button>
                      <Button variant="outline" onClick={() => setBlogView("list")}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {blogView === "list" && (
                <Card>
                  <CardContent className="p-0">
                    {(blogPosts ?? []).length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">Nenhum artigo criado ainda.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {(blogPosts ?? []).map((post) => (
                          <div key={post.id} className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant={post.published ? "default" : "outline"} className="text-xs">
                                  {post.published ? "Publicado" : "Rascunho"}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                              </div>
                              <div className="font-medium truncate">{post.title}</div>
                              <div className="text-xs text-muted-foreground">/blog/{post.slug} · {post.views} views</div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => {
                                setBlogForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category, content: post.content, coverImageUrl: post.coverImageUrl ?? "", seoTitle: post.seoTitle, seoDescription: post.seoDescription, published: post.published });
                                setEditingPostId(post.id);
                                setBlogView("form");
                              }}>Editar</Button>
                              <Button size="sm" variant="outline" onClick={async () => {
                                await updateBlogPost.mutateAsync({ id: post.id, data: { published: !post.published } });
                                refetchBlog();
                                toast.success(post.published ? "Rascunho salvo" : "Artigo publicado!");
                              }}>{post.published ? "Despublicar" : "Publicar"}</Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                                await deleteBlogPost.mutateAsync({ id: post.id });
                                refetchBlog();
                                toast.success("Artigo excluído.");
                              }}>Excluir</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ─── EMAIL EM MASSA ─── */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">E-mail em Massa</h1>
                <p className="text-muted-foreground text-sm">Envie comunicados para todos os usuários da plataforma</p>
              </div>

              <Card>
                <CardHeader><CardTitle>Novo envio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Assunto</Label>
                    <Input value={emailForm.subject} onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Novidades do Vermotu — Junho 2026" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destinatários</Label>
                    <select value={emailForm.targetFilter} onChange={(e) => setEmailForm((f) => ({ ...f, targetFilter: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                      <option value="all">Todos os usuários</option>
                      <option value="pro">Usuários com plano Pro/Premium</option>
                      <option value="free">Usuários no plano Free</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Corpo da mensagem</Label>
                    <textarea
                      rows={8}
                      value={emailForm.body}
                      onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
                      placeholder="Olá! Temos novidades incríveis para você no Vermotu..."
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">⚠️ O envio fica registrado nos logs. Certifique-se do conteúdo antes de confirmar.</p>
                    <Button onClick={async () => {
                      if (!emailForm.subject.trim() || !emailForm.body.trim()) { toast.error("Preencha assunto e corpo do e-mail."); return; }
                      try {
                        const result = await sendEmail.mutateAsync({ data: { subject: emailForm.subject, body: emailForm.body, targetFilter: emailForm.targetFilter, sentBy: currentUserId ?? 1, sentByName: "Admin" } });
                        toast.success(`Campanha registrada! ${result.recipientCount} destinatários.`);
                        setEmailForm({ subject: "", body: "", targetFilter: "all" });
                        refetchEmailCampaigns();
                        logAction("Enviar e-mail em massa", `Assunto: ${emailForm.subject} — ${result.recipientCount} destinatários`);
                      } catch { toast.error("Erro ao registrar campanha."); }
                    }} disabled={sendEmail.isPending}>
                      {sendEmail.isPending ? "Enviando..." : "Registrar envio"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Histórico de campanhas</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {(emailCampaigns ?? []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">Nenhuma campanha enviada ainda.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {(emailCampaigns ?? []).map((c) => (
                        <div key={c.id} className="p-4 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium">{c.subject}</span>
                            <Badge variant="secondary">{c.recipientCount} destinatários</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Enviado por {c.sentByName} · {formatDateBR(c.createdAt)} · Filtro: {c.targetFilter}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{c.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── BANNERS ─── */}
          {activeTab === "banners" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Banners do Carrossel</h1>
                  <p className="text-muted-foreground text-sm">Gerencie os banners do carousel da home. Arraste para reordenar (use ▲▼).</p>
                </div>
                {bannerView === "list" && (
                  <Button onClick={() => { setBannerForm(BANNER_BLANK); setEditingBannerId(null); setBannerView("form"); }}>
                    <Plus className="w-4 h-4 mr-2" /> Novo banner
                  </Button>
                )}
              </div>

              {bannerView === "form" && (
                <Card>
                  <CardHeader><CardTitle>{editingBannerId ? "Editar banner" : "Novo banner"}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Título *</Label>
                        <Input value={bannerForm.title} onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))} placeholder="Tudo para sua moto" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Subtítulo</Label>
                        <Input value={bannerForm.subtitle} onChange={(e) => setBannerForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Texto de apoio ao título" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Texto do botão (CTA)</Label>
                        <Input value={bannerForm.ctaText} onChange={(e) => setBannerForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Comprar peças" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>URL do botão</Label>
                        <Input value={bannerForm.ctaUrl} onChange={(e) => setBannerForm((f) => ({ ...f, ctaUrl: e.target.value }))} placeholder="/pecas" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label>URL da imagem de fundo</Label>
                        <Input value={bannerForm.imageUrl} onChange={(e) => setBannerForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://... ou /images/banner.jpg" />
                        {bannerForm.imageUrl && (
                          <div className="mt-2 h-28 rounded-lg overflow-hidden border border-border">
                            <img src={bannerForm.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cor de fundo (quando sem imagem)</Label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={bannerForm.bgColor} onChange={(e) => setBannerForm((f) => ({ ...f, bgColor: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                          <Input value={bannerForm.bgColor} onChange={(e) => setBannerForm((f) => ({ ...f, bgColor: e.target.value }))} className="font-mono text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Duração (segundos)</Label>
                        <Input type="number" min={3} max={30} value={bannerForm.durationSecs} onChange={(e) => setBannerForm((f) => ({ ...f, durationSecs: parseInt(e.target.value) || 6 }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ordem</Label>
                        <Input type="number" value={bannerForm.order} onChange={(e) => setBannerForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <select value={bannerForm.active ? "true" : "false"} onChange={(e) => setBannerForm((f) => ({ ...f, active: e.target.value === "true" }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Início (opcional)</Label>
                        <Input type="datetime-local" value={bannerForm.startsAt} onChange={(e) => setBannerForm((f) => ({ ...f, startsAt: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fim (opcional)</Label>
                        <Input type="datetime-local" value={bannerForm.endsAt} onChange={(e) => setBannerForm((f) => ({ ...f, endsAt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        disabled={!bannerForm.title || createBanner.isPending || updateBanner.isPending}
                        onClick={() => {
                          const payload = {
                            title: bannerForm.title,
                            subtitle: bannerForm.subtitle || undefined,
                            ctaText: bannerForm.ctaText || undefined,
                            ctaUrl: bannerForm.ctaUrl || undefined,
                            imageUrl: bannerForm.imageUrl || undefined,
                            bgColor: bannerForm.bgColor || undefined,
                            order: bannerForm.order,
                            active: bannerForm.active,
                            durationSecs: bannerForm.durationSecs,
                            startsAt: bannerForm.startsAt || null,
                            endsAt: bannerForm.endsAt || null,
                          };
                          if (editingBannerId) {
                            updateBanner.mutate({ id: editingBannerId, data: payload }, {
                              onSuccess: () => { toast.success("Banner atualizado."); setBannerView("list"); refetchBanners(); },
                              onError: () => toast.error("Erro ao atualizar banner."),
                            });
                          } else {
                            createBanner.mutate({ data: payload }, {
                              onSuccess: () => { toast.success("Banner criado."); setBannerView("list"); refetchBanners(); },
                              onError: () => toast.error("Erro ao criar banner."),
                            });
                          }
                        }}
                      >
                        {editingBannerId ? "Salvar alterações" : "Criar banner"}
                      </Button>
                      <Button variant="outline" onClick={() => { setBannerView("list"); setEditingBannerId(null); }}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bannerView === "list" && (
                <Card>
                  <CardContent className="p-0">
                    {(adminBanners ?? []).length === 0 ? (
                      <div className="p-10 text-center text-muted-foreground">
                        <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="mb-3">Nenhum banner criado ainda.</p>
                        <Button variant="outline" onClick={() => { setBannerForm(BANNER_BLANK); setEditingBannerId(null); setBannerView("form"); }}>
                          <Plus className="w-4 h-4 mr-2" /> Criar primeiro banner
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ordem</TableHead>
                            <TableHead>Preview</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Duração</TableHead>
                            <TableHead>CTA</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(adminBanners ?? []).map((b, idx) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <button disabled={idx === 0} onClick={() => {
                                    updateBanner.mutate({ id: b.id, data: { order: b.order - 1 } }, { onSuccess: () => refetchBanners() });
                                  }} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                  <span className="text-center text-sm font-mono">{b.order}</span>
                                  <button disabled={idx === (adminBanners?.length ?? 0) - 1} onClick={() => {
                                    updateBanner.mutate({ id: b.id, data: { order: b.order + 1 } }, { onSuccess: () => refetchBanners() });
                                  }} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="w-20 h-12 rounded-lg overflow-hidden border border-border" style={{ background: `${b.bgColor}44` }}>
                                  {b.imageUrl
                                    ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                                  }
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm">{b.title}</div>
                                {b.subtitle && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{b.subtitle}</div>}
                              </TableCell>
                              <TableCell>
                                <Badge variant={b.active ? "default" : "secondary"} className={b.active ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                                  {b.active ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{b.durationSecs}s</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{b.ctaText || "—"} → {b.ctaUrl || "/"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    setBannerForm({
                                      title: b.title, subtitle: b.subtitle, ctaText: b.ctaText, ctaUrl: b.ctaUrl,
                                      imageUrl: b.imageUrl, bgColor: b.bgColor, order: b.order, active: b.active,
                                      durationSecs: b.durationSecs,
                                      startsAt: b.startsAt ? b.startsAt.slice(0, 16) : "",
                                      endsAt: b.endsAt ? b.endsAt.slice(0, 16) : "",
                                    });
                                    setEditingBannerId(b.id);
                                    setBannerView("form");
                                  }}>Editar</Button>
                                  <Button size="sm" variant="ghost" className="text-destructive"
                                    onClick={() => {
                                      if (!confirm(`Excluir banner "${b.title}"?`)) return;
                                      deleteBanner.mutate({ id: b.id }, { onSuccess: () => { toast.success("Banner excluído."); refetchBanners(); } });
                                    }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent, warn }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30" : ""}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-primary text-primary-foreground" : warn ? "bg-amber-500/15 text-amber-500" : "bg-primary/10 text-primary"}`}>
          {warn ? <AlertTriangle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground leading-none mb-1">{label}</div>
          <div className="text-xl font-bold leading-none">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthRow({ label, value, max, color = "primary" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barColor = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : color === "red" ? "bg-red-500" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SettingRow({ label, description, value, highlight }: { label: string; description?: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className={`text-sm font-mono shrink-0 ${highlight ? "text-emerald-500" : "text-muted-foreground"}`}>{value}</div>
    </div>
  );
}
