import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sista Viljan - ditt testament",
    template: "%s · Sista Viljan - ditt testament",
  },
  description:
    "Skriv ett juridiskt giltigt testamente på 15 minuter. Anpassat för din familjesituation. Låg engångskostnad.",
  openGraph: {
    title: "Sista Viljan - ditt testament",
    description:
      "Skriv ett juridiskt giltigt testamente på 15 minuter. Anpassat för din familjesituation.",
    locale: "sv_SE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
