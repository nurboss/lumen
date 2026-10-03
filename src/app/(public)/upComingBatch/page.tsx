import { getSession } from "@/lib/auth";
import { getAvailableBatches } from "@/lib/batches";
import { BatchCard } from "@/components/batch-card";

export const dynamic = "force-dynamic";

export default async function UpcomingBatchPage() {
  const user = await getSession();
  const batches = await getAvailableBatches(user?.id, { startDate: { gte: new Date() } });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Enroll now</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Upcoming batches</h1>
      {batches.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No upcoming batches scheduled.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => <BatchCard key={batch.id} batch={batch} isAuthed={Boolean(user)} />)}
        </div>
      )}
    </div>
  );
}
