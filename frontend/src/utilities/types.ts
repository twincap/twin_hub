import type { ComponentType } from "react";

export type UtilityRuntime = "client" | "next-api" | "external-api" | "supabase";

export type UtilityStatus = "ready" | "beta" | "planned";

export type UtilityDefinition = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  runtime: UtilityRuntime;
  status: UtilityStatus;
  accent: string;
  path: `/utilities/${string}`;
  apiRoute?: `/api/${string}`;
};

export type UtilityComponentProps = {
  utility: UtilityDefinition;
};

export type UtilityComponent = ComponentType<UtilityComponentProps>;
