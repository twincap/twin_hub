import Link from "next/link";
import { ArrowLeft, Database, PlugZap, ServerCog } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityPageShellProps = {
  utility: UtilityDefinition;
  children: ReactNode;
};

const runtimeIcon = {
  client: PlugZap,
  "next-api": ServerCog,
  "external-api": ServerCog,
  supabase: Database
};

export function UtilityPageShell({ utility, children }: UtilityPageShellProps) {
  const RuntimeIcon = runtimeIcon[utility.runtime];

  return (
    <section className="utility-page" style={{ "--accent": utility.accent } as CSSProperties}>
      <div className="utility-hero">
        <div>
          <p className="eyebrow">{utility.category}</p>
          <h1>{utility.name}</h1>
          <p>{utility.description}</p>
          <div className="tag-list">
            {utility.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="runtime-list">
          <span className="runtime-pill">
            <RuntimeIcon size={14} aria-hidden="true" />
            {utility.runtime}
          </span>
          <span className="status-pill">{utility.status}</span>
        </div>
      </div>

      <div className="inline-actions">
        <Link className="button" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          허브
        </Link>
        {utility.apiRoute ? <code className="runtime-pill">{utility.apiRoute}</code> : null}
      </div>

      <div className="utility-panel">{children}</div>
    </section>
  );
}
