import { SiteHeader } from "@/components/site-header";
import { UtilityIndex } from "@/components/utility-index";
import { utilities } from "@/utilities/registry";

export default function HomePage() {
  const categoryCount = new Set(utilities.map((utility) => utility.category)).size;
  const readyCount = utilities.filter((utility) => utility.status === "ready").length;

  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="page-shell">
        <section className="dashboard-intro" aria-labelledby="home-title">
          <div className="intro-copy">
            <p className="eyebrow">유틸 작업공간</p>
            <h1 id="home-title">Twin Hub</h1>
            <p className="intro-summary">등록된 기능과 현재 상태를 한곳에서 확인할 수 있습니다.</p>
          </div>
          <div className="system-panel" aria-label="등록 현황">
            <div className="system-row">
              <span>전체 유틸</span>
              <strong>{utilities.length}개</strong>
            </div>
            <div className="system-row">
              <span>카테고리</span>
              <strong>{categoryCount}개</strong>
            </div>
            <div className="system-row">
              <span>사용 가능</span>
              <strong>{readyCount}개</strong>
            </div>
          </div>
        </section>

        <UtilityIndex utilities={utilities} />
      </main>
    </div>
  );
}
