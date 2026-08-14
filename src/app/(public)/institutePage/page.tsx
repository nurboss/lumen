import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export const revalidate = 300;

export default async function InstitutePage() {
  const institutes = await prisma.institute.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Partners</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Institutes</h1>

      {institutes.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No institutes listed yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-5">
                <h2 className="font-heading font-semibold text-foreground">{i.name}</h2>
                {i.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{i.description}</p>}
                {i.address && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {i.address}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
