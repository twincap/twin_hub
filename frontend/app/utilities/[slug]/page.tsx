import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { UtilityPageShell } from "@/components/utility-page-shell";
import { UtilityRenderer } from "@/components/utility-renderer";
import { getUtility, utilities } from "@/utilities/registry";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return utilities.map((utility) => ({
    slug: utility.slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const utility = getUtility(slug);

  if (!utility) {
    return {
      title: "Utility"
    };
  }

  return {
    title: utility.name,
    description: utility.summary
  };
}

export default async function UtilityPage({ params }: PageProps) {
  const { slug } = await params;
  const utility = getUtility(slug);

  if (!utility) {
    notFound();
  }

  return (
    <div className="app-frame">
      <SiteHeader />
      <main className="page-shell">
        <UtilityPageShell utility={utility}>
          <UtilityRenderer utility={utility} />
        </UtilityPageShell>
      </main>
    </div>
  );
}
