import { getSession } from "@/lib/auth";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { ChatRoom } from "@/components/chat-room";

export const dynamic = "force-dynamic";

export default async function ChattingPage() {
  const user = await getSession();
  return (
    <div>
      <DashboardHeading title="Group chat" subtitle="Platform-wide discussion." />
      <ChatRoom roomKey="group:general" currentUserId={user!.id} />
    </div>
  );
}
