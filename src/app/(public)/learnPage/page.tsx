import { StaticPageView } from "@/components/static-page-view";

export const revalidate = 300;

export default function LearnPage() {
  return <StaticPageView slug="learn" fallbackTitle="How to Learn" />;
}
