import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPlayerData } from "@/lib/curriculum";
import { CoursePlayer } from "@/components/course-player";

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/student/my-course/${id}`);

  const data = await getPlayerData(id, user.id);
  if (!data) notFound();
  if (!data.enrolled) redirect(`/courseDetails/${id}`);

  return <CoursePlayer data={data} />;
}
