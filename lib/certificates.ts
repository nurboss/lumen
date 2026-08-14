import "server-only";
import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";

/** Generate a human-friendly unique certificate code, e.g. CERT-9F3A2B7C. */
function generateCode(): string {
  return `CERT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Issues a completion certificate (and badge, if configured) for a user+course
 * when eligible. Idempotent: returns the existing certificate if already issued.
 */
export async function issueCertificateIfEligible(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      completionCertificate: true,
      certificatePassingPercent: true,
      certificateTemplateId: true,
      badgeTitle: true,
      badgePercentage: true,
    },
  });
  if (!course || !course.completionCertificate) return null;

  const existing = await prisma.certificate.findFirst({
    where: { userId, courseId, isAdditional: false },
  });
  if (existing) return existing;

  // Unique code with a couple of retries in the unlikely event of collision.
  let code = generateCode();
  for (let i = 0; i < 3; i++) {
    const clash = await prisma.certificate.findUnique({ where: { code } });
    if (!clash) break;
    code = generateCode();
  }

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      code,
      templateId: course.certificateTemplateId ?? null,
      passingPercentage: course.certificatePassingPercent ?? 100,
    },
  });

  // Badge (optional).
  if (course.badgeTitle) {
    const hasBadge = await prisma.badge.findFirst({ where: { userId, courseId, title: course.badgeTitle } });
    if (!hasBadge) {
      await prisma.badge.create({
        data: {
          userId,
          courseId,
          title: course.badgeTitle,
          percentage: course.badgePercentage ?? null,
        },
      });
    }
  }

  await prisma.notification.create({
    data: {
      userId,
      type: "CERTIFICATE",
      title: "Certificate issued",
      body: `You earned a certificate for completing "${course.title}".`,
      link: "/student/certificate",
    },
  });

  return certificate;
}
