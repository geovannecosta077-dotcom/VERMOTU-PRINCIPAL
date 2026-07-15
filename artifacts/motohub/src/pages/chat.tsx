import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useSession, formatRelative, imageUrl } from "@/lib/session";
import {
  useListConversations,
  useListMessages,
  useSendMessage,
  useListItems,
  useListUsers,
  getListMessagesQueryKey,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Chat() {
  const currentUserId = useSession((s) => s.currentUserId);
  const [, params] = useRoute("/chat/:id");
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const [activeId, setActiveId] = useState<number | null>(params?.id ? Number(params.id) : null);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Mensagens — Vermotu"; }, []);
  useEffect(() => { if (!currentUserId) setLoginOpen(true); }, [currentUserId, setLoginOpen]);
  useEffect(() => { if (params?.id) setActiveId(Number(params.id)); }, [params?.id]);

  const { data: conversations } = useListConversations(
    { userId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListConversationsQueryKey({ userId: currentUserId ?? 0 }) } },
  );
  const { data: items } = useListItems({});
  const { data: users } = useListUsers();

  const { data: messages } = useListMessages(activeId ?? 0, {
    query: { enabled: !!activeId, refetchInterval: 3000, queryKey: getListMessagesQueryKey(activeId ?? 0) },
  });
  const sendMsg = useSendMessage();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !text.trim() || !currentUserId) return;
    sendMsg.mutate(
      { id: activeId, data: { senderId: currentUserId, text: text.trim() } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeId) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ userId: currentUserId }) });
        },
      },
    );
  };

  const userName = (id: number) => users?.find((u) => u.id === id)?.name ?? `Usuário #${id}`;
  const itemTitle = (id: number) => items?.find((i) => i.id === id)?.title ?? `Anúncio #${id}`;
  const itemImage = (id: number) => imageUrl(items?.find((i) => i.id === id)?.image);

  if (!currentUserId) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Entre para acessar suas mensagens.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container py-6 h-[calc(100vh-4rem-1px)] flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Mensagens</h1>
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
          <Card className="flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border font-semibold text-sm">Conversas</div>
            <div className="overflow-auto flex-1">
              {(conversations ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma conversa ainda. Acesse um anúncio e clique em "Contatar vendedor".
                </div>
              ) : (
                conversations!.map((c) => {
                  const other = c.buyerId === currentUserId ? c.sellerId : c.buyerId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left p-3 border-b border-border hover:bg-accent/30 transition-colors flex gap-3 ${activeId === c.id ? "bg-accent/40" : ""}`}
                      data-testid={`conversation-${c.id}`}
                    >
                      <img src={itemImage(c.itemId)} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{userName(other)}</div>
                        <div className="text-xs text-muted-foreground truncate">{itemTitle(c.itemId)}</div>
                        <div className="text-xs text-muted-foreground">{formatRelative(c.updatedAt)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="flex flex-col overflow-hidden">
            {activeId ? (
              <>
                {(() => {
                  const conv = (conversations ?? []).find((c) => c.id === activeId);
                  if (!conv) return null;
                  const other = conv.buyerId === currentUserId ? conv.sellerId : conv.buyerId;
                  const section = items?.find((i) => i.id === conv.itemId)?.type;
                  const path = section === "moto" ? "motos" : section === "peca" ? "pecas" : "servicos";
                  return (
                    <div className="p-3 border-b border-border flex items-center gap-3">
                      <img src={itemImage(conv.itemId)} alt="" className="w-10 h-10 rounded-md object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{userName(other)}</div>
                        <Link href={`/${path}/${conv.itemId}`} className="text-xs text-muted-foreground hover:text-primary truncate block">
                          {itemTitle(conv.itemId)}
                        </Link>
                      </div>
                    </div>
                  );
                })()}
                <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
                  {(messages ?? []).map((m) => {
                    const mine = m.senderId === currentUserId;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                          <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="Escreva uma mensagem..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    data-testid="input-message"
                  />
                  <Button type="submit" size="icon" disabled={sendMsg.isPending || !text.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-3 opacity-40" />
                <p>Selecione uma conversa</p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </Layout>
  );
}
