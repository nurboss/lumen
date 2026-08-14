import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";

export const revalidate = 300;

export default async function AgentOfficePage() {
  const offices = await prisma.agentOffice.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Nationwide</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Agent offices</h1>

      {offices.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No agent offices listed yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5">
                <h2 className="font-heading font-semibold text-foreground">{o.name}</h2>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {o.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {o.location}</p>}
                  {o.contact && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {o.contact}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
