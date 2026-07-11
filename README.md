# Twin Hub

여러 유틸 사이트를 하나의 GitHub 레포와 하나의 Vercel 배포로 운영하기 위한 모노레포입니다.

이 레포는 아직 실제 유틸이 없는 빈 틀입니다. 유틸을 추가할 때마다 프론트엔드 화면은 `frontend`, 서버 로직은 `backend`에 나누어 둡니다.

## 전체 구조

```txt
twin_hub/
  frontend/   # Next.js App Router, React 화면, Vercel API route 입구
  backend/    # 백엔드가 필요한 유틸별 서버 로직
```

역할은 분명하게 나눕니다.

- `frontend`: 사용자가 보는 화면, 유틸 목록, 유틸별 페이지, 유틸별 프론트 API handler
- `backend`: 외부 API 호출, Supabase 쿼리, 서버 키가 필요한 기능, 무거운 계산 로직

`frontend/app/api`는 HTTP 요청을 받는 얇은 입구입니다. 실제 프론트 API handler는 `frontend/src/utilities/<slug>/api`, 서버 로직은 `backend/utilities/<slug>`에 작성합니다.

## 처음 실행

루트 폴더에서 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 엽니다.

```txt
http://localhost:3000
```

## 자주 쓰는 명령

```bash
npm run dev        # frontend Next.js 개발 서버 실행
npm run lint       # frontend lint
npm run typecheck  # frontend/backend 타입체크
npm run test       # frontend/backend 자동 테스트
npm run build      # Vercel 배포용 production build 확인
npm run check      # lint + typecheck + test + build 전체 확인
```

## 유틸 추가 위치

백엔드가 없는 유틸:

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx
```

백엔드가 있는 유틸:

```txt
frontend/src/utilities/<slug>/
  metadata.ts
  page.tsx
  api/        # API route handler logic, only when this utility needs a custom API

backend/utilities/<slug>/
  index.ts
  service.ts
  types.ts
```

백엔드가 있다면 반드시 `backend/utilities/<slug>` 폴더를 만들고 그 안에서 작업합니다. 프론트 API 처리 코드도 `frontend/src/utilities/<slug>/api` 안에 둡니다.

`frontend/app/api/<slug>/route.ts`는 Next.js 라우팅 때문에 남겨두는 얇은 연결 파일입니다. 실제 로직을 그 파일 안에 직접 작성하지 않고, 유틸 폴더의 API 파일을 re-export합니다.

## Vercel 배포

Vercel에는 레포 루트를 연결합니다.

- Install Command: `npm install`
- Build Command: `npm run build`
- Development Command: `npm run dev`

루트 `package.json`이 `frontend` 워크스페이스의 Next.js 빌드로 위임합니다.

## 환경 변수

로컬 개발에서는 `frontend/.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Media Downloader
MEDIA_DOWNLOADER_ENABLED=false
YT_DLP_PATH=yt-dlp
YT_DLP_JS_RUNTIME=node
YT_DLP_SOCKET_TIMEOUT_SECONDS=30
YT_DLP_RETRIES=10
YT_DLP_FRAGMENT_RETRIES=10
YT_DLP_STALLED_TIMEOUT_MS=120000
YT_DLP_NO_OUTPUT_TIMEOUT_MS=1800000
MEDIA_DOWNLOAD_DIR=
```

Supabase가 필요 없는 유틸은 Supabase 값을 비워둬도 됩니다.

## Media Downloader 운영 조건

`Media Downloader`는 서버에서 `yt-dlp`와 `ffmpeg`를 실행합니다.

로컬에서 실제 다운로드를 사용하려면:

1. `yt-dlp` 설치
2. `ffmpeg` 설치
3. `frontend/.env.local`에 `MEDIA_DOWNLOADER_ENABLED=true` 설정
4. 필요하면 `YT_DLP_PATH`, `YT_DLP_JS_RUNTIME`, `YT_DLP_NO_OUTPUT_TIMEOUT_MS`, `MEDIA_DOWNLOAD_DIR` 지정

Vercel 서버리스는 실행 시간과 임시 파일 용량 제한이 있습니다. 긴 영상이나 큰 파일 다운로드는 로컬 실행, 별도 워커, 별도 서버에서 처리하는 구성이 더 적합합니다. 이 레포의 Vercel API route는 HTTP 입구로 유지하고, 무거운 다운로드 작업은 분리하는 것을 권장합니다.

## Codec Converter 운영 조건

`Codec Converter`는 서버에서 `ffmpeg`를 실행해 업로드 파일을 다른 코덱/컨테이너 프로필로 변환합니다.

로컬에서 실제 변환을 사용하려면:

1. `ffmpeg` 설치
2. `frontend/.env.local`에 `MEDIA_CONVERTER_ENABLED=true` 설정
3. 필요하면 `FFMPEG_PATH`, `MEDIA_CONVERT_DIR`, `MEDIA_CONVERT_MAX_MB` 지정

지원 프로필은 FFmpeg가 일반적으로 많이 지원하는 조합 위주입니다. MP1, MP2, MP3, WAV, AIFF, FLAC, AAC, ALAC, Vorbis, Speex, WMA, WavPack, TTA, AMR-NB, AMR-WB, Codec 2, SBC, aptX, Opus, H.261, H.263, H.264, H.265, H.266/VVC, VP8, VP9, AV1, MPEG-1, MPEG-2, MPEG-4 Part 2, ProRes, Motion JPEG, DV, Theora, WMV, MXF 등을 프로필로 제공합니다.

Opus는 오디오 단독과 OGG/WebM/MKV/MP4 영상 프로필에서 명시적으로 지원합니다. `Remux` 프로필은 코덱을 다시 인코딩하지 않고 MP4, MKV, WebM, MOV, TS, AVI, OGG, MKA 같은 컨테이너로 빠르게 재래핑합니다. 단, 원본 코덱이 대상 컨테이너에서 허용될 때만 성공합니다.

모든 코덱 간 완전 상호 변환은 현실적으로 FFmpeg 빌드에 포함된 encoder/decoder에 따라 달라집니다. 실패하면 job 로그에 FFmpeg 오류가 표시됩니다.

## 문서

- 프론트엔드 상세 문서: [frontend/README.md](frontend/README.md)
- 백엔드 상세 문서: [backend/README.md](backend/README.md)
- 새 유틸 추가 규칙: [GUIDELINES.md](GUIDELINES.md)
