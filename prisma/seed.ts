import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const PASSWORD = "password123";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Users ────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@lumen.test" },
    update: {},
    create: {
      fullName: "Lumen Admin",
      email: "admin@lumen.test",
      phoneNumber: "01700000000",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@lumen.test" },
    update: {},
    create: {
      fullName: "Rahim Uddin",
      email: "instructor@lumen.test",
      phoneNumber: "01700000001",
      passwordHash,
      role: "INSTRUCTOR",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      bio: "Full-stack instructor with 8 years of teaching experience.",
      instructorProfile: {
        create: {
          headline: "Senior Software Engineer & Mentor",
          approved: true,
          ratingAvg: 4.8,
          ratingCount: 42,
        },
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@lumen.test" },
    update: {},
    create: {
      fullName: "Karim Ahmed",
      email: "student@lumen.test",
      phoneNumber: "01700000002",
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  const catData = [
    { name: "Web Development", icon: "code" },
    { name: "Data Science", icon: "bar-chart" },
    { name: "Design", icon: "palette" },
    { name: "Language", icon: "languages" },
  ];
  const categories = await Promise.all(
    catData.map((c) =>
      prisma.courseCategory.upsert({
        where: { slug: slugify(c.name) },
        update: {},
        create: { name: c.name, slug: slugify(c.name), iconUrl: c.icon },
      })
    )
  );

  // ── Courses (with curriculum) ──────────────────────────────────────────────
  const courseSpecs = [
    {
      title: "Full-Stack Web Development with Next.js",
      short: "Build production apps end-to-end",
      type: "ONLINE" as const,
      level: "INTERMEDIATE" as const,
      regularPrice: 500000,
      sellPrice: 350000,
      isFree: false,
      category: categories[0],
      sections: [
        { title: "Getting Started", units: ["Course Overview", "Setting up your environment", "Your first page"] },
        { title: "React Fundamentals", units: ["Components & Props", "State & Hooks", "Data fetching"] },
        { title: "Backend & Database", units: ["API routes", "Prisma & PostgreSQL", "Authentication"] },
      ],
    },
    {
      title: "Introduction to Data Science",
      short: "Python, statistics, and machine learning basics",
      type: "VIDEO" as const,
      level: "BEGINNER" as const,
      regularPrice: 400000,
      sellPrice: 0,
      isFree: true,
      category: categories[1],
      sections: [
        { title: "Python Basics", units: ["Variables & types", "Control flow", "Functions"] },
        { title: "Data Analysis", units: ["NumPy & Pandas", "Visualization", "Cleaning data"] },
      ],
    },
    {
      title: "UI/UX Design Foundations",
      short: "Design beautiful, usable interfaces",
      type: "ONLINE" as const,
      level: "BEGINNER" as const,
      regularPrice: 300000,
      sellPrice: 250000,
      isFree: false,
      category: categories[2],
      sections: [
        { title: "Design Principles", units: ["Color theory", "Typography", "Layout & spacing"] },
        { title: "Tools", units: ["Figma basics", "Prototyping"] },
      ],
    },
  ];

  for (const spec of courseSpecs) {
    const slug = slugify(spec.title);
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) continue;

    const createdCourse = await prisma.course.create({
      data: {
        title: spec.title,
        shortTitle: spec.short,
        slug,
        description: `<p>${spec.short}. This course covers everything you need to get started and build real projects.</p>`,
        whatWillLearn: ["Real-world projects", "Best practices", "Certificate on completion"],
        categoryId: spec.category.id,
        authorId: instructor.id,
        type: spec.type,
        status: "PUBLISHED",
        level: spec.level,
        language: "bn",
        regularPrice: spec.regularPrice,
        sellPrice: spec.sellPrice,
        isFree: spec.isFree,
        firstSectionFree: true,
        completionCertificate: true,
        certificatePassingPercent: 70,
        sections: {
          create: spec.sections.map((sec, si) => ({
            title: sec.title,
            order: si,
            units: {
              create: sec.units.map((u, ui) => ({
                title: u,
                order: ui,
                type: "VIDEO" as const,
                isFree: si === 0,
                duration: 10,
                durationUnit: "MINUTE" as const,
                publicVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              })),
            },
          })),
        },
      },
    });

    // Record each seeded unit as an ordered SectionItem (the curriculum entry).
    const createdSections = await prisma.section.findMany({
      where: { courseId: createdCourse.id },
      include: { units: { orderBy: { order: "asc" } } },
    });
    for (const s of createdSections) {
      for (const u of s.units) {
        await prisma.sectionItem.create({
          data: { sectionId: s.id, kind: "UNIT", unitId: u.id, order: u.order },
        });
      }
    }
  }

  // A batch for the first course
  const firstCourse = await prisma.course.findFirst({ orderBy: { createdAt: "asc" } });
  if (firstCourse) {
    const hasBatch = await prisma.batch.findFirst({ where: { courseId: firstCourse.id } });
    if (!hasBatch) {
      await prisma.batch.create({
        data: {
          courseId: firstCourse.id,
          name: "Batch 01",
          startDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
          scheduleDays: ["SAT", "MON", "WED"],
          scheduleTime: "20:00",
          seats: 30,
          createdById: instructor.id,
        },
      });
    }
  }

  // ── Quiz (attached to the first section of the first course) ────────────────
  if (firstCourse) {
    const firstSection = await prisma.section.findFirst({
      where: { courseId: firstCourse.id },
      orderBy: { order: "asc" },
    });
    const hasQuizItem = firstSection
      ? await prisma.sectionItem.findFirst({
          where: { sectionId: firstSection.id, kind: "QUIZ" },
          select: { id: true },
        })
      : null;
    if (firstSection && !hasQuizItem) {
      const quiz = await prisma.quiz.create({
        data: {
          title: "Getting Started Quiz",
          subtitle: "Check your understanding",
          authorId: instructor.id,
          marks: 3,
          passingMarks: 2,
          showResultAfterSubmit: true,
          autoEvaluate: true,
          extraRetakes: 2,
        },
      });

      const questionSpecs = [
        {
          text: "What command creates a new Next.js app?",
          options: [
            { id: "a", text: "npx create-next-app" },
            { id: "b", text: "npm new next" },
            { id: "c", text: "next init" },
          ],
          correct: ["a"],
        },
        {
          text: "React components must return a single root element.",
          type: "TRUE_FALSE" as const,
          options: [
            { id: "t", text: "True" },
            { id: "f", text: "False" },
          ],
          correct: ["t"],
        },
        {
          text: "Which are valid React hooks? (select all)",
          type: "MCQ_MULTI" as const,
          options: [
            { id: "a", text: "useState" },
            { id: "b", text: "useEffect" },
            { id: "c", text: "useComponent" },
          ],
          correct: ["a", "b"],
        },
      ];

      let order = 0;
      for (const q of questionSpecs) {
        const question = await prisma.question.create({
          data: {
            text: q.text,
            type: q.type ?? "MCQ_SINGLE",
            options: q.options,
            correctAnswer: q.correct,
            marks: 1,
            authorId: instructor.id,
          },
        });
        await prisma.quizQuestion.create({
          data: { quizId: quiz.id, questionId: question.id, order: order++ },
        });
      }

      const unitCount = await prisma.unit.count({ where: { sectionId: firstSection.id } });
      await prisma.sectionItem.create({
        data: { sectionId: firstSection.id, kind: "QUIZ", quizId: quiz.id, order: unitCount },
      });
    }
  }

  // ── Banner ──────────────────────────────────────────────────────────────────
  const bannerExists = await prisma.banner.findFirst();
  if (!bannerExists) {
    await prisma.banner.create({
      data: {
        heroTitle: "Learn with focus. Grow with Lumen.",
        heroSubtitle: "Bangla-language online & offline courses taught by industry mentors.",
        discountTitle: "New Year Offer",
        discountPercent: 30,
        countdownEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        active: true,
      },
    });
  }

  // ── Blog categories + posts ─────────────────────────────────────────────────
  const blogCat = await prisma.blogCategory.upsert({
    where: { slug: "tutorials" },
    update: {},
    create: { name: "Tutorials", slug: "tutorials" },
  });
  const blogExists = await prisma.blog.findUnique({ where: { slug: "getting-started-with-nextjs" } });
  if (!blogExists) {
    await prisma.blog.create({
      data: {
        title: "Getting Started with Next.js",
        slug: "getting-started-with-nextjs",
        subtitle: "A beginner-friendly guide to the App Router.",
        content: "<p>Next.js is a powerful React framework. In this post we cover the basics.</p>",
        categoryId: blogCat.id,
        authorId: instructor.id,
        status: "PUBLISHED",
        isPopular: true,
        tags: ["nextjs", "react", "beginner"],
      },
    });
  }

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages = [
    { slug: "about-us", title: "About Us", content: "<p>Lumen is a Bangla-first learning platform.</p>" },
    { slug: "terms", title: "Terms & Conditions", content: "<p>Terms of service.</p>" },
    { slug: "contact", title: "Contact Us", content: "<p>Reach us anytime.</p>" },
    { slug: "learn", title: "How to Learn", content: "<p>Study tips.</p>" },
  ];
  for (const p of staticPages) {
    await prisma.staticPage.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log("Seed complete:");
  console.log(`  Admin:      admin@lumen.test / ${PASSWORD}`);
  console.log(`  Instructor: instructor@lumen.test / ${PASSWORD}`);
  console.log(`  Student:    student@lumen.test / ${PASSWORD}`);
  console.log(`  ${categories.length} categories, ${courseSpecs.length} courses. (student: ${student.email})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
