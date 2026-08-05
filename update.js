const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  await prisma.course.updateMany({
    data: { status: 'PUBLISHED' }
  });
  console.log('All courses updated to PUBLISHED');
}

update().finally(() => prisma.$disconnect());
