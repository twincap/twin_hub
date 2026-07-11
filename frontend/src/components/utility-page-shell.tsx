import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { getUtilityStatusLabel } from "@/utilities/labels";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityPageShellProps = {
  utility: UtilityDefinition;
  children: ReactNode;
};

export function UtilityPageShell({ utility, children }: UtilityPageShellProps) {
  return (
    <section className="utility-page" style={{ "--accent": utility.accent } as CSSProperties}>
      <div className="utility-hero compact">
        <div>
          <p className="eyebrow">
            {utility.category} · {getUtilityStatusLabel(utility.status)}
          </p>
          <h1>{utility.name}</h1>
          <p>{utility.description}</p>
        </div>
        <Link className="button" href="/utilities">
          <ArrowLeft size={16} aria-hidden="true" />
          전체 유틸
        </Link>
      </div>

      <div className="utility-panel">{children}</div>
    </section>
  );
}
