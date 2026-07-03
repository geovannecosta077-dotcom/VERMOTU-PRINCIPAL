import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetBlogPost, getGetBlogPostQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Eye, Calendar, User, Share2 } from "lucide-react";
import { toast } from "sonner";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function readTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function renderContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} className="text-3xl font-black mt-8 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold mt-6 mb-3 text-primary">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-xl font-semibold mt-5 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={i} className="ml-6 list-disc mb-1 text-muted-foreground">{line.slice(2)}</li>;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-foreground my-2">{line.slice(2, -2)}</p>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="leading-relaxed text-muted-foreground my-2">{line}</p>;
  });
}

export function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";

  const { data: post, isLoading, error } = useGetBlogPost(slug, {
    query: { enabled: !!slug, queryKey: getGetBlogPostQueryKey(slug) },
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl mx-auto px-4 py-20">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-64 bg-muted rounded-xl" />
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-muted rounded" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="text-xl font-bold">Artigo não encontrado</p>
          <Link href="/blog"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao blog</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b border-border/40 bg-muted/20 py-3 px-4">
          <div className="container max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-foreground line-clamp-1">{post.title}</span>
            </div>
          </div>
        </div>

        <article className="container max-w-3xl mx-auto px-4 py-10 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">{post.category}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight">{post.title}</h1>
            {post.excerpt && <p className="text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border/40 py-4">
              {post.authorName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.authorName}
                </span>
              )}
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {readTime(post.content)} min de leitura
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {post.views.toLocaleString("pt-BR")} views
              </span>
              <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto gap-1.5">
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>

          {/* Cover image */}
          {post.coverImageUrl && (
            <div className="rounded-2xl overflow-hidden aspect-video">
              <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div className="prose-custom space-y-1">
            {renderContent(post.content)}
          </div>

          {/* Footer */}
          <div className="border-t border-border/40 pt-8 flex items-center justify-between flex-wrap gap-4">
            <Link href="/blog">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao blog
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Compartilhar artigo
            </Button>
          </div>
        </article>
      </div>
    </Layout>
  );
}
