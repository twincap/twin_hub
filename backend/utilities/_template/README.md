# Backend Utility Template

백엔드가 필요한 유틸은 반드시 아래 구조로 만듭니다.

```txt
backend/utilities/<slug>/
  index.ts
  service.ts
  types.ts
```

## index.ts

route handler가 import할 공개 함수를 둡니다.

```ts
import { runJob } from "./service";

export async function getExamplePayload() {
  const result = await runJob();

  return {
    result,
    source: "backend/utilities/<slug>",
    timestamp: new Date().toISOString()
  };
}
```

## service.ts

외부 API 호출, Supabase 쿼리, 복잡한 계산 로직을 둡니다.

## types.ts

이 유틸에서만 사용하는 요청/응답 타입을 둡니다.

## 연결해야 하는 파일

1. `backend/utilities/index.ts`
2. 필요하면 `backend/package.json`의 `exports`
3. `frontend/src/utilities/<slug>/api`
4. `frontend/app/api/.../route.ts`는 유틸 폴더 API를 re-export만 합니다.
