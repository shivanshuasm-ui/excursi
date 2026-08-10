import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { slugify } from "../utils/slug.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../validators/admin.schema.js";

/** Public list of categories for filter UIs. */
export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "category";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === excludeId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** Admin: create a category (slug auto-derived from name if omitted). */
export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug
    ? await uniqueCategorySlug(input.slug)
    : await uniqueCategorySlug(input.name);
  return prisma.category.create({
    data: { name: input.name, slug },
  });
}

/** Admin: update a category. */
export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound("Category not found");
  }
  const slug =
    input.slug !== undefined
      ? await uniqueCategorySlug(input.slug, id)
      : undefined;
  return prisma.category.update({
    where: { id },
    data: { name: input.name, ...(slug ? { slug } : {}) },
  });
}

/** Admin: delete a category (experiences keep pointing at null via SetNull). */
export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound("Category not found");
  }
  await prisma.category.delete({ where: { id } });
}
