import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityPageShellProps = {
  utility: UtilityDefinition;
  children: ReactNode;
};

export function UtilityPageShell({ utility, children }: UtilityPageShellProps) {
  return (
    <section className="utility-page" style={{ "--accent": utility.accent } as CSSProperties}>
      <div className="utility-hero compact">
        <h1>{utility.name}</h1>
      </div>

      <div className="inline-actions">
        <Link className="button" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          허브
        </Link>
      </div>

      <div className="utility-panel">{children}</div>
    </section>
  );
}
