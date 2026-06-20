# Frontend Utility Template

프론트엔드 유틸 폴더 템플릿입니다.

새 유틸을 만들 때:

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx
  api/
    route.ts
```

## metadata.ts

```ts
import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "<slug>",
  name: "<Utility Name>",
  summary: "<짧은 목록 설명>",
  description: "<유틸 페이지 설명>",
  category: "<Category>",
  tags: ["tag"],
  runtime: "client",
  status: "planned",
  accent: "#5865f2",
  path: "/utilities/<slug>"
} satisfies UtilityDefinition;
```

## page.tsx

```tsx
"use client";

export default function ExampleUtility() {
  return <div className="utility-surface">...</div>;
}
```

## 연결해야 하는 파일

1. `frontend/src/utilities/registry.ts`
2. `frontend/src/components/utility-renderer.tsx`

백엔드가 필요한 유틸이라면 `backend/utilities/<slug>`도 반드시 만듭니다.

커스텀 API가 필요한 유틸이라면 실제 route handler 로직은 이 폴더의 `api` 안에 둡니다. `frontend/app/api/<slug>/route.ts`는 아래처럼 얇게 연결만 합니다.

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET, POST } from "@/utilities/<slug>/api/route";
```
