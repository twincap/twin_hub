# Twin Hub Frontend

`frontend`는 사용자가 보는 모든 화면과 Vercel API route 입구를 담는 Next.js 앱입니다.

## 실행 방법

레포 루트에서 실행하는 방법을 권장합니다.

```bash
npm install
npm run dev
```

프론트엔드 폴더에서 직접 실행할 수도 있습니다.

```bash
cd frontend
npm run dev
```

기본 주소:

```txt
http://localhost:3000
```

## 검증 명령

루트에서 실행:

```bash
npm run lint
npm run typecheck
npm run build
npm run check
```

프론트엔드만 직접 실행:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

## 폴더 구조

```txt
frontend/
  app/
    layout.tsx
    page.tsx
    globals.css
    utilities/
      page.tsx
      [slug]/page.tsx
    api/
      health/route.ts
      utilities/[slug]/route.ts
  src/
    components/
      site-header.tsx
      utility-index.tsx
      utility-page-shell.tsx
      utility-renderer.tsx
    lib/
      supabase/browser.ts
    utilities/
      registry.ts
      types.ts
      _template/README.md
```

## 새 프론트엔드 유틸 만들기

예시 slug가 `color-converter`라면 다음 폴더를 만듭니다.

```txt
frontend/src/utilities/color-converter/
  metadata.ts
  page.tsx
```

`metadata.ts` 예시:

```ts
import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "color-converter",
  name: "Color Converter",
  summary: "HEX, RGB, HSL 값을 변환합니다.",
  description: "브라우저에서만 동작하는 색상 변환 유틸입니다.",
  category: "Design",
  tags: ["color", "design", "client"],
  runtime: "client",
  status: "planned",
  accent: "#5865f2",
  path: "/utilities/color-converter"
} satisfies UtilityDefinition;
```

`page.tsx`에는 실제 화면을 작성합니다.

그 다음 두 곳에 연결합니다.

1. `frontend/src/utilities/registry.ts`
2. `frontend/src/components/utility-renderer.tsx`

## 백엔드가 필요한 경우

프론트엔드 폴더만 만들지 않습니다. 반드시 백엔드 폴더도 만듭니다.

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx
  api/
    route.ts       # custom API가 필요할 때 실제 route handler 로직
    file-route.ts  # 파일 다운로드 같은 하위 route가 필요할 때

backend/utilities/<slug>/
  index.ts
  service.ts
  types.ts
```

`frontend/app/api/<slug>/route.ts`는 Next.js가 URL route로 인식하기 위한 얇은 파일만 둡니다.

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET, POST } from "@/utilities/<slug>/api/route";
```

실제 API 처리 흐름은 `frontend/src/utilities/<slug>/api` 안에 두고, 무거운 서버 로직은 `@twin-hub/backend`에서 import합니다.

## 디자인 방향

현재 UI는 디스코드 느낌의 어두운 앱 쉘을 기준으로 합니다.

- 큰 랜딩 페이지나 마케팅 문구를 만들지 않습니다.
- 메인 페이지 제목은 작고 짧게 유지합니다.
- 설명 문구보다 검색, 목록, 상태 패널 같은 앱 UI를 우선합니다.
- 기본 색상은 dark gray와 blurple 계열을 씁니다.
- 유틸 페이지마다 과한 히어로 섹션을 만들지 않습니다.

## Media Downloader 프론트엔드

경로:

```txt
frontend/src/utilities/media-downloader/
```

API:

```txt
POST /api/media-downloader
GET  /api/media-downloader?jobId=<jobId>
GET  /api/media-downloader/file?jobId=<jobId>
```

이 유틸은 서버 기능이 필요하므로 실제 로직은 `backend/utilities/media-downloader`에 있습니다. 프론트엔드는 URL과 출력 형식을 API로 전달하고 작업 상태를 polling합니다. 품질은 항상 가능한 최고 품질로 처리합니다.

## Codec Converter 프론트엔드

경로:

```txt
frontend/src/utilities/media-converter/
```

API:

```txt
POST /api/media-converter
GET  /api/media-converter?jobId=<jobId>
GET  /api/media-converter/file?jobId=<jobId>
```

프론트엔드는 파일 업로드, 출력 프로필 선택, 프로필 검색, 오디오/비디오/Remux 필터, FFmpeg 상태 표시, 상태 polling, 결과 파일 다운로드를 담당합니다. 실제 변환은 `backend/utilities/media-converter`에서 FFmpeg로 수행합니다.

화면 동작:

1. `GET /api/media-converter`로 활성화 여부, FFmpeg 감지 상태, 최대 업로드 용량, 변환 프로필 목록을 가져옵니다.
2. 사용자는 파일과 출력 프로필을 선택합니다.
3. `POST /api/media-converter`로 파일을 업로드하면 job id가 발급됩니다.
4. 프론트엔드는 `GET /api/media-converter?jobId=<jobId>`를 반복 호출해 상태를 갱신합니다.
5. 완료되면 `/api/media-converter/file?jobId=<jobId>` 링크로 결과 파일을 다운로드합니다.

Remux 프로필은 코덱을 다시 인코딩하지 않고 컨테이너만 바꾸는 빠른 모드입니다. 원본 코덱이 대상 컨테이너와 호환되지 않으면 FFmpeg 로그에 실패 이유가 표시됩니다.
