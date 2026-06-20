import { SiteHeader } from "@/components/site-header";
import { UtilityIndex } from "@/components/utility-index";
import { utilities } from "@/utilities/registry";

export default function HomePage() {
  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="page-shell">
        <section className="dashboard-intro" aria-labelledby="home-title">
          <div className="intro-copy">
            <p className="eyebrow">Workspace</p>
            <h1 id="home-title">Twin Hub</h1>
          </div>
          <div className="system-panel" aria-label="프로젝트 구조">
            <div className="system-row">
              <span>Frontend</span>
              <strong>Next.js App Router</strong>
            </div>
            <div className="system-row">
              <span>Backend</span>
              <strong>Utility modules</strong>
            </div>
            <div className="system-row">
              <span>Database</span>
              <strong>Supabase ready</strong>
            </div>
            <div className="system-row">
              <span>Deploy</span>
              <strong>Vercel</strong>
            </div>
          </div>
        </section>

        <UtilityIndex utilities={utilities} />
      </main>
    </div>
  );
}
