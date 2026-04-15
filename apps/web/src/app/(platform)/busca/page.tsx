import { searchStorefront } from "@/lib/storefront/service";
import { SearchSuggest } from "@/components/cinema/search-suggest";
import { SectionHeading } from "@/components/ui/section-heading";
import { copy } from "@/lib/copy/catalog";

export default async function SearchPage() {
  const initialItems = await searchStorefront("salvador");

  return (
    <main className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={copy("searchPageEyebrow")}
        title={copy("searchPageTitle")}
        description={copy("searchPageDescription")}
      />
      <SearchSuggest initialItems={initialItems} />
    </main>
  );
}
