export const dynamic = "force-dynamic";

import { ConversationFlow } from "@/components/will/ConversationFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skriv ditt testamente — Sista Viljan",
  description: "Skriv ett juridiskt giltigt testamente på 15 minuter.",
};

export default function AppPage() {
  return <ConversationFlow />;
}
