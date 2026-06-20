# Twin Hub Guidelines

새 유틸을 만들 때 따르는 작업 규칙입니다.

## 1. 핵심 원칙

- 하나의 유틸은 하나의 slug를 가집니다.
- slug는 kebab-case를 사용합니다. 예: `text-tools`, `image-resizer`, `exchange-rate`.
- 프론트엔드 화면은 `frontend/src/utilities/<slug>`에 둡니다.
- 백엔드가 필요한 경우 반드시 `backend/utilities/<slug>` 폴더를 만들고 그 안에서 작업합니다.
- `frontend/app/api`는 HTTP URL을 열어주는 얇은 입구입니다. 실제 API handler 코드는 `frontend/src/utilities/<slug>/api`에 둡니다.
- 비즈니스 로직과 서버 작업은 `backend/utilities/<slug>`에 둡니다.
- DB가 필요하면 Supabase를 우선 사용합니다.
- 하나의 GitHub 레포와 하나의 Vercel 배포를 유지합니다.

## 2. 유틸 종류 선택

### 백엔드 없는 유틸

브라우저 안에서만 처리할 수 있는 기능입니다.

예:

- 텍스트 카운터
- 색상 변환기
- 단위 변환기
- 간단한 계산기

구조:

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx
```

### 백엔드 있는 유틸

서버가 필요한 기능입니다.

예:

- API key가 필요한 외부 API 조회
- Supabase 저장/조회
- 파일 처리
- 서버에서만 해야 하는 계산
- 민감한 키나 토큰이 필요한 작업

구조:

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx

backend/utilities/<slug>/
  index.ts
  service.ts
  types.ts
```

## 3. 프론트엔드 추가 순서

1. `frontend/src/utilities/<slug>` 폴더를 만듭니다.
2. `metadata.ts`를 작성합니다.
3. `page.tsx`를 작성합니다.
4. 커스텀 API가 필요하면 `frontend/src/utilities/<slug>/api` 폴더를 만들고 route handler 로직을 작성합니다.
5. `frontend/app/api/<slug>/route.ts`는 유틸 폴더 API를 re-export하는 얇은 파일만 작성합니다.
6. `frontend/src/utilities/registry.ts`에 metadata를 import하고 배열에 추가합니다.
7. `frontend/src/components/utility-renderer.tsx`에 컴포넌트를 연결합니다.
8. `npm run typecheck`를 실행합니다.

## 4. 백엔드 추가 순서

백엔드가 필요한 경우 아래 순서를 추가로 따릅니다.

1. `backend/utilities/<slug>` 폴더를 만듭니다.
2. `types.ts`에 요청/응답 타입을 정의합니다.
3. `service.ts`에 외부 API, DB, 계산 로직을 작성합니다.
4. `index.ts`에 route handler가 호출할 공개 함수를 작성합니다.
5. `backend/utilities/index.ts`에 slug 분기를 추가합니다.
6. 필요하면 `backend/package.json`의 `exports`에 유틸 경로를 추가합니다.
7. `frontend/src/utilities/<slug>/api`에서 `@twin-hub/backend`를 import해 호출합니다.
8. `frontend/app/api`에는 re-export만 둡니다. 긴 로직을 직접 작성하지 않습니다.

## 5. metadata 작성 규칙

`metadata.ts`는 유틸 목록과 라우팅의 기준입니다.

필수 필드:

```ts
{
  slug: "example-tool",
  name: "Example Tool",
  summary: "목록 카드에 들어가는 짧은 설명",
  description: "유틸 페이지에 들어가는 설명",
  category: "Text",
  tags: ["text", "client"],
  runtime: "client",
  status: "planned",
  accent: "#5865f2",
  path: "/utilities/example-tool"
}
```

runtime 값:

- `client`: 백엔드 없음
- `next-api`: Next API route 사용
- `external-api`: 외부 API 호출 중심
- `supabase`: Supabase 사용

status 값:

- `planned`: 아직 제작 전
- `beta`: 동작하지만 다듬는 중
- `ready`: 사용 가능한 상태

## 6. API route 작성 규칙

좋은 방식:

```ts
import { NextResponse } from "next/server";
import { getSomethingPayload } from "@twin-hub/backend/utilities/something";

export async function GET() {
  const payload = await getSomethingPayload();
  return NextResponse.json(payload);
}
```

피할 방식:

```ts
// route.ts 안에 외부 API 호출, DB 쿼리, 긴 계산 로직을 전부 쓰지 않습니다.
```

## 7. 보안 규칙

- `.env.local`은 커밋하지 않습니다.
- API key는 클라이언트 컴포넌트에서 읽지 않습니다.
- `NEXT_PUBLIC_`으로 시작하는 값은 브라우저에 노출됩니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 백엔드에서만 사용합니다.
- 사용자 입력을 외부 API나 DB에 넘길 때는 백엔드에서 검증합니다.

## 8. 디자인 규칙

현재 UI 방향은 디스코드 느낌의 어두운 앱입니다.

- 메인 페이지는 짧고 실용적으로 유지합니다.
- 큰 마케팅 hero 문구를 만들지 않습니다.
- AI 서비스처럼 보이는 그라데이션, 둥근 빛 번짐, 과한 설명 문구를 피합니다.
- 카드 반경은 8px 이하를 기본으로 합니다.
- 유틸 화면은 “도구”가 바로 보이게 만듭니다.
- 앱 UI 색상은 dark gray, blurple, muted text를 기본으로 합니다.

## 9. 다운로드/미디어 처리 규칙

미디어 다운로드 유틸처럼 외부 플랫폼 콘텐츠를 처리하는 기능은 서버 기능으로 분류합니다.

필수 규칙:

- 프론트엔드만으로 구현하지 않습니다.
- 실제 다운로드/변환 로직은 `backend/utilities/<slug>`에 둡니다.
- API route는 요청 검증과 백엔드 함수 호출만 담당합니다.
- DRM 우회, 쿠키 추출, 로그인 우회 기능은 넣지 않습니다.
- UI에는 사용자가 다운로드 권한을 확인하는 체크박스를 둡니다.
- 긴 작업은 job id 기반 상태 조회 구조로 만듭니다.
- 대용량 파일은 Vercel 서버리스보다 별도 워커/서버가 적합합니다.

로컬 바이너리가 필요한 경우 README에 명시합니다.

```bash
yt-dlp
ffmpeg
```

## 10. 코덱/컨테이너 변환 규칙

코덱 변환은 확장자 rename이 아니라 실제 트랜스코딩입니다.

필수 규칙:

- FFmpeg 기반 백엔드 유틸로 작성합니다.
- 업로드 파일은 서버 임시 디렉터리에 저장하고 job id를 발급합니다.
- 결과 파일은 `/api/<utility>/file?jobId=...` 방식으로 다운로드합니다.
- 지원 범위는 “프로필”로 명시합니다.
- “모든 코덱 전부 지원”처럼 보장할 수 없는 표현은 피합니다.
- Opus는 반드시 하나 이상의 오디오 프로필과 영상 컨테이너 프로필에서 지원합니다.
- 확장자만 바꾸는 기능이 필요하면 `remux-*` 프로필처럼 `-c copy` 기반 컨테이너 재래핑으로 구현합니다.
- FFmpeg 빌드에 따라 encoder/decoder가 없을 수 있는 프로필은 notes나 README에 “FFmpeg 빌드 지원 필요”라고 적습니다.
- 화면에는 프로필 검색과 분류 필터를 제공해 프로필 수가 늘어나도 선택이 어렵지 않게 만듭니다.
- 서버 정보 API에는 실행 바이너리 감지 상태를 포함해 환경 설정 문제를 화면에서 확인할 수 있게 합니다.
- 큰 파일 변환은 Vercel 서버리스보다 별도 워커/서버를 권장합니다.

지원 프로필을 늘릴 때는 `backend/utilities/media-converter/profiles.ts`에 추가합니다.

## 11. 새 유틸 체크리스트

- [ ] slug 결정
- [ ] 프론트엔드 폴더 생성: `frontend/src/utilities/<slug>`
- [ ] `metadata.ts` 작성
- [ ] `page.tsx` 작성
- [ ] `registry.ts` 등록
- [ ] `utility-renderer.tsx` 연결
- [ ] 백엔드가 필요하면 `backend/utilities/<slug>` 생성
- [ ] 백엔드가 필요하면 `backend/utilities/index.ts` 연결
- [ ] 환경 변수가 필요하면 `frontend/.env.local`과 Vercel에 추가
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
