import { prisma } from "../lib/prisma.js";

/** Public list of categories for filter UIs. */
export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}
