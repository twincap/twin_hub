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
            <p className="eyebrow">작업공간</p>
            <h1 id="home-title">Twin Hub</h1>
          </div>
          <div className="system-panel" aria-label="프로젝트 구조">
            <div className="system-row">
              <span>프론트엔드</span>
              <strong>Next.js App Router</strong>
            </div>
            <div className="system-row">
              <span>백엔드</span>
              <strong>유틸별 모듈</strong>
            </div>
            <div className="system-row">
              <span>데이터베이스</span>
              <strong>Supabase 준비됨</strong>
            </div>
            <div className="system-row">
              <span>배포</span>
              <strong>Vercel</strong>
            </div>
          </div>
        </section>

        <UtilityIndex utilities={utilities} />
      </main>
    </div>
  );
}
