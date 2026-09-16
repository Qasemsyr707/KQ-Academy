const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const fieldsToCascade = [
  'courseId', 'chapterId', 'lessonId', 'quizId', 'questionId'
];

fieldsToCascade.forEach(field => {
  const regex = new RegExp((fields: \\\\[\\\\], references: \\\\[id\\\\])\\\\), 'g');
  schema = schema.replace(regex, $1, onDelete: Cascade));
});

// Also add it for some User relations that are safe to cascade (enrollments, payments, etc), but actually the user is just trying to delete a course. So we stick to course-related hierarchies.

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated.');
