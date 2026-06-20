import Link from "next/link";
import { GitBranch, LayoutGrid } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark">TH</span>
        <span>
          <strong>Twin Hub</strong>
          <small>Utility workspace</small>
        </span>
      </Link>
      <nav className="header-actions" aria-label="주요 링크">
        <Link className="button" href="/utilities">
          <LayoutGrid size={18} aria-hidden="true" />
          유틸
        </Link>
        <a className="icon-button" href="https://github.com" aria-label="GitHub" title="GitHub">
          <GitBranch size={18} aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
