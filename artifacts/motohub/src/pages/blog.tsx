import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Clock, Eye, ChevronRight, Rss } from "lucide-react";

const CATEGORIES = ["Todos", "Segurança", "Manutenção", "Legislação", "Dicas", "Novidades", "geral"];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function readTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function Blog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const { data: posts = [], isLoading } = useListBlogPosts({});

  const filtered = posts.filter((p) => {
    const matchCat = category === "Todos" || p.category === category;
    const matchSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background py-12 px-4">
          <div className="container max-w-5xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Rss className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-widest">Blog MotoHub</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black">
              Segurança, dicas &amp; novidades
              <br />
              <span className="text-primary">para motociclistas</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Conteúdo especializado para você andar com mais segurança, cuidar melhor da sua moto e ficar por dentro das leis de trânsito.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); }}
              className="max-w-md mx-auto flex gap-2 mt-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar artigos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </form>
          </div>
        </section>

        <div className="container max-w-5xl mx-auto px-4 py-10 space-y-10">
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat)}
                className="rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>

          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card animate-pulse h-64" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-24 space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-lg font-semibold">Nenhum artigo encontrado</p>
              <p className="text-sm text-muted-foreground">Tente outra categoria ou termo de busca.</p>
            </div>
          )}

          {/* Featured post */}
          {!isLoading && featured && (
            <Link href={`/blog/${featured.slug}`} className="block group">
              <article className="rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
                {featured.coverImageUrl && (
                  <div className="aspect-[21/9] overflow-hidden">
                    <img
                      src={featured.coverImageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6 md:p-8 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize">{featured.category}</Badge>
                    <Badge className="bg-primary/10 text-primary border-0">Destaque</Badge>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black group-hover:text-primary transition-colors line-clamp-2">
                    {featured.title}
                  </h2>
                  <p className="text-muted-foreground line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {readTime(featured.content)} min de leitura
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {featured.views.toLocaleString("pt-BR")} views
                    </span>
                    <span>{featured.authorName || "MotoHub"}</span>
                    {featured.publishedAt && <span>{formatDate(featured.publishedAt)}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-primary font-semibold text-sm mt-2">
                    Ler artigo <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            </Link>
          )}

          {/* Rest of posts grid */}
          {!isLoading && rest.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
                  <article className="h-full rounded-xl border border-border/40 bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col">
                    {post.coverImageUrl ? (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-red-900/20 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-primary/40" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1 space-y-2">
                      <Badge variant="outline" className="w-fit text-xs capitalize">{post.category}</Badge>
                      <h3 className="font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {readTime(post.content)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
