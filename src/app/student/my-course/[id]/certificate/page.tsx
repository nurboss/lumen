import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { issueCertificateIfEligible } from "@/lib/certificates";

export const dynamic = "force-dynamic";

/**
 * Resolves a student's completion certificate for a course and forwards to the
 * public verification/download page. Issues it on the spot if the course is
 * fully complete and offers a certificate but one hasn't been created yet.
 */
export default async function MyCourseCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/student/my-course/${courseId}/certificate`);

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId },
    select: { progressPercent: true },
  });

  // Already issued? Go straight to it.
  let cert = await prisma.certificate.findFirst({
    where: { userId: user.id, courseId, isAdditional: false },
    select: { code: true },
  });

  // Not yet issued but eligible → issue now.
  if (!cert && enrollment && enrollment.progressPercent >= 100) {
    const issued = await issueCertificateIfEligible(user.id, courseId);
    if (issued) cert = { code: issued.code };
  }

  if (cert) redirect(`/certificate/${cert.code}`);

  // Not available: explain why, in the interface's voice.
  const reason =
    !enrollment
      ? "You're not enrolled in this course."
      : enrollment.progressPercent < 100
        ? "Finish every lesson to unlock your certificate."
        : "This course doesn't offer a completion certificate.";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Award className="h-12 w-12 text-muted-foreground" />
          <h1 className="font-heading text-xl font-bold text-foreground">Certificate not available</h1>
          <p className="text-sm text-muted-foreground">{reason}</p>
          <Link href={`/student/my-course/${courseId}`} className={`${buttonVariants({ variant: "outline" })} mt-4`}>
            Back to course
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
