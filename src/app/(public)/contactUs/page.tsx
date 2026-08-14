import prisma from "@/lib/prisma";
import { ContactForm } from "./contact-form";

export const revalidate = 300;

export default async function ContactUsPage() {
  const page = await prisma.staticPage.findUnique({ where: { slug: "contact" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="eyebrow">Get in touch</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {page?.title ?? "Contact Us"}
      </h1>
      {page && (
        <div
          className="prose prose-sm mt-6 max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
