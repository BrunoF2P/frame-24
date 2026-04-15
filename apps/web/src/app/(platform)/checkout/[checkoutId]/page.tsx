import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/cinema/checkout-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";
import { getConcessions, getSessionById } from "@/lib/storefront/service";
import { submitCheckout } from "./actions";

export default async function CheckoutPage({ params }: { params: Promise<{ checkoutId: string }> }) {
  const { checkoutId } = await params;
  const [session, concessions] = await Promise.all([getSessionById(checkoutId), getConcessions()]);

  if (!session) {
    notFound();
  }

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={copy("checkoutSectionEyebrow")}
        title={copy("checkoutSectionTitle")}
        description={copy("checkoutSectionDescription")}
      />
      <CheckoutForm action={submitCheckout} concessions={concessions} session={session} />
    </main>
  );
}
