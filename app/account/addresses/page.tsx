import type { Metadata } from "next";
import { getMyAddresses } from "@/lib/addresses";
import { AddressesManager } from "@/components/account/AddressesManager";

export const metadata: Metadata = { title: "Saved Addresses — TrendyMall" };

export default async function AddressesPage() {
  const addresses = await getMyAddresses();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Saved Addresses</h1>
      <div className="mt-6">
        <AddressesManager addresses={addresses} />
      </div>
    </div>
  );
}
