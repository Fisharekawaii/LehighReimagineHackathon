import type { Metadata } from "next";
import "../src/styles.css";
export const metadata: Metadata = {
  title: "DayTripper — Go together.",
  description:
    "Plan a getaway together. Shared plans, clear budgets, and your favorite people.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
