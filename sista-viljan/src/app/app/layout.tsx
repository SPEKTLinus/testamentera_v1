import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skriv ditt testamente — Sista Viljan",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
