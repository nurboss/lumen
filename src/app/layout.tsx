import type { Metadata } from "next";
import "./globals.css";
import {
  Plus_Jakarta_Sans,
  Bricolage_Grotesque,
  Geist_Mono,
  Lora,
} from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Lora({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Lumen — Learn with focus",
  description:
    "Bangla-language online & offline course marketplace and learning platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        sans.variable,
        heading.variable,
        mono.variable,
        serif.variable
      )}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
