import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skriv ditt testamente",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
