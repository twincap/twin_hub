import { NextResponse } from "next/server";
import { getHealthPayload } from "@twin-hub/backend/health";

export function GET() {
  return NextResponse.json(getHealthPayload());
}
