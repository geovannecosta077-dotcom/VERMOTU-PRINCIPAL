import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  ListBlogPostsQueryParams,
  GetBlogPostParams,
  AdminCreateBlogPostBody,
  AdminUpdateBlogPostParams,
  AdminUpdateBlogPostBody,
  AdminDeleteBlogPostParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

router.get("/blog/posts", async (req, res): Promise<void> => {
  const parsed = ListBlogPostsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof eq>[] = [];
  if (parsed.success && parsed.data.category) {
    conditions.push(eq(blogPostsTable.category, parsed.data.category));
  }
  const adminMode = parsed.success && parsed.data.published !== undefined;
  if (!adminMode) {
    conditions.push(eq(blogPostsTable.published, true));
  }
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.createdAt));
  res.json(rows);
});

router.get("/blog/posts/:slug", async (req, res): Promise<void> => {
  const parsed = GetBlogPostParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Slug inválido." }); return; }
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.slug, parsed.data.slug));
  if (!post) { res.status(404).json({ error: "Post não encontrado." }); return; }
  await db.update(blogPostsTable).set({ views: post.views + 1 }).where(eq(blogPostsTable.id, post.id));
  res.json({ ...post, views: post.views + 1 });
});

router.get("/admin/blog/posts", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.createdAt));
  res.json(rows);
});

router.post("/admin/blog/posts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos." }); return; }
  const { title, slug, content, excerpt, category, authorId, authorName, published, seoTitle, seoDescription, coverImageUrl } = parsed.data;
  const finalSlug = slug || slugify(title);
  const [created] = await db
    .insert(blogPostsTable)
    .values({
      title,
      slug: finalSlug,
      content,
      excerpt: excerpt ?? "",
      category: category ?? "geral",
      authorId,
      authorName: authorName ?? "",
      published: published ?? false,
      publishedAt: published ? new Date() : null,
      seoTitle: seoTitle ?? title,
      seoDescription: seoDescription ?? excerpt ?? "",
      coverImageUrl: coverImageUrl ?? null,
    })
    .returning();
  res.status(201).json(created!);
});

router.patch("/admin/blog/posts/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminUpdateBlogPostParams.safeParse(req.params);
  const body = AdminUpdateBlogPostBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Dados inválidos." }); return; }
  const updates: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
  if (body.data.published === true) updates.publishedAt = new Date();
  const [updated] = await db
    .update(blogPostsTable)
    .set(updates)
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Post não encontrado." }); return; }
  res.json(updated);
});

router.delete("/admin/blog/posts/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminDeleteBlogPostParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "ID inválido." }); return; }
  await db.delete(blogPostsTable).where(eq(blogPostsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
