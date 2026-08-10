import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

/**
 * Seed (or promote) the platform admin. Admins are never self-registered.
 * Run: `npm run seed:admin` — configure via ADMIN_EMAIL / ADMIN_PASSWORD.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@excursi.local";
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  const name = process.env.ADMIN_NAME ?? "Excursi Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log(`Promoted existing user ${email} to ADMIN`);
    } else {
      console.log(`Admin ${email} already exists`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });
  console.log(`Created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
