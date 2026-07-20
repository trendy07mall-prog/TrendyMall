import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy",
  description:
    "TrendyMall returns and refunds policy — eligibility, conditions, and how replacements or refunds are handled.",
};

export default function ReturnsPage() {
  return (
    <PageShell title="Returns & Refunds Policy">
      <p>
        Your satisfaction is important to us. Please review our return
        policy before making a purchase.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Returns</h2>
      <ul className="list-disc pl-5">
        <li>
          Returns are accepted only for products that arrive damaged,
          defective, or incorrectly shipped.
        </li>
        <li>
          Any return request must be made within 48 hours of receiving your
          order.
        </li>
      </ul>

      <h2 className="font-heading mt-4 text-lg font-bold">Non-Returnable Items</h2>
      <p>
        For hygiene and quality assurance reasons, we do not accept returns
        or exchanges on opened or used electronic accessories, unless the
        item is faulty.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Refunds & Replacements</h2>
      <p>
        After inspecting the returned item, TrendyMall will provide either:
      </p>
      <ul className="list-disc pl-5">
        <li>A replacement product (subject to stock availability), or</li>
        <li>A full refund if a replacement is unavailable.</li>
      </ul>

      <h2 className="font-heading mt-4 text-lg font-bold">Return Conditions</h2>
      <p>Returned items must:</p>
      <ul className="list-disc pl-5">
        <li>Be in their original packaging.</li>
        <li>Include all accessories and documentation.</li>
        <li>Show no signs of misuse or physical damage caused after delivery.</li>
      </ul>

      <p>
        For assistance, please contact our customer support team before
        returning any item.
      </p>
    </PageShell>
  );
}
