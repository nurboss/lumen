import { StaticPageView } from "@/components/static-page-view";

export const revalidate = 300;

export default function AboutUsPage() {
  return <StaticPageView slug="about-us" fallbackTitle="About Us" />;
}
