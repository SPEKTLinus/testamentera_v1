export const dynamic = "force-dynamic";

import { AccountPage } from "@/components/account/AccountPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mitt konto",
};

export default function Account() {
  return <AccountPage />;
}
