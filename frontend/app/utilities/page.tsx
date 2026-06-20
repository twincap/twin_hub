import { SiteHeader } from "@/components/site-header";
import { UtilityIndex } from "@/components/utility-index";
import { utilities } from "@/utilities/registry";

export const metadata = {
  title: "Utilities"
};

export default function UtilitiesPage() {
  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="page-shell">
        <div className="section-head">
          <div>
            <p className="eyebrow">Utilities</p>
            <h1>유틸 목록</h1>
          </div>
        </div>
        <UtilityIndex utilities={utilities} />
      </main>
    </div>
  );
}
