import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create an Instructor
  const instructor = await prisma.user.upsert({
    where: { email: 'qasem@example.com' },
    update: {},
    create: {
      name: 'م. قاسم',
      email: 'qasem@example.com',
      password: 'hashed_password_123',
      role: 'INSTRUCTOR',
    },
  })

  // Create a Course
  const course = await prisma.course.create({
    data: {
      title: 'هندسة البرمجيات المتقدمة (قاعدة بيانات حقيقية)',
      description: 'هذا الكورس تم سحبه مباشرة من قاعدة البيانات SQLite باستخدام Prisma.',
      price: 150000,
      category: 'برمجة وتطوير',
      thumbnail: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      rating: 5.0,
      instructorId: instructor.id,
    },
  })

  console.log('Seeding finished. Course created:', course.title)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
