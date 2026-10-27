"use client";

import { PageHeader } from "@/components/common";
import { PackageCards, PackagesSteps } from "@/components/packages";

export default function AppPackagesPage() {
  return (
    <>
      <PageHeader
        title="Paketler"
        description="Abonelik yok. Paketini seç, lisans anahtarın e-postayla gelsin, hesabında etkinleştir."
      />
      <PackageCards />
      <PackagesSteps />
    </>
  );
}
