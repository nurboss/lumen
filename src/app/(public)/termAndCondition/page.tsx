import { StaticPageView } from "@/components/static-page-view";

export const revalidate = 300;

export default function TermsPage() {
  return <StaticPageView slug="terms" fallbackTitle="Terms & Conditions" />;
}
