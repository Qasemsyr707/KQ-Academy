const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.courseQuestion.deleteMany({
    where: { text: { contains: 'موز' } }
  });
  console.log(res);
}
main().then(() => prisma.$disconnect());
