import { SiteHeader } from "@/components/site-header";
import { UtilityIndex } from "@/components/utility-index";
import { utilities } from "@/utilities/registry";

export const metadata = {
  title: "유틸"
};

export default function UtilitiesPage() {
  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="page-shell">
        <UtilityIndex headingLevel={1} utilities={utilities} />
      </main>
    </div>
  );
}
