import Link from "next/link";
import { GitBranch, LayoutGrid } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark">TH</span>
        <span>
          <strong>Twin Hub</strong>
          <small>유틸 작업공간</small>
        </span>
      </Link>
      <nav className="header-actions" aria-label="주요 링크">
        <Link className="button" href="/utilities">
          <LayoutGrid size={18} aria-hidden="true" />
          유틸
        </Link>
        <a
          className="icon-button"
          href="https://github.com/twincap/twin_hub"
          aria-label="GitHub 저장소(새 창)"
          rel="noreferrer"
          target="_blank"
          title="GitHub 저장소"
        >
          <GitBranch size={18} aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
