import { NextResponse } from "next/server";
import { getUtilityBackendPayload } from "@twin-hub/backend/utilities";
import { getUtility } from "@/utilities/registry";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const utility = getUtility(slug);

  if (!utility) {
    return NextResponse.json(
      {
        error: "Utility not found"
      },
      {
        status: 404
      }
    );
  }

  const backendPayload = await getUtilityBackendPayload({
    slug,
    utility
  });

  return NextResponse.json(
    backendPayload ?? {
      utility,
      backend: false,
      source: "frontend/app/api/utilities/[slug]",
      timestamp: new Date().toISOString()
    }
  );
}
