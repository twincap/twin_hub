# Twin Hub Backend

`backend`는 백엔드가 필요한 유틸의 서버 로직을 모아두는 워크스페이스입니다.

Next.js API route 파일은 `frontend/app/api`에 있지만, 그 파일은 얇은 re-export만 둡니다. 실제 프론트 API handler는 `frontend/src/utilities/<slug>/api`, 서버 처리 코드는 이 폴더에 둡니다.

## 실행 방법

백엔드만 독립 서버로 띄우는 구조는 아직 없습니다. Next.js 개발 서버가 API route를 실행하고, 유틸 폴더의 API handler가 백엔드 함수를 import합니다.

루트에서 개발 서버 실행:

```bash
npm install
npm run dev
```

백엔드 타입체크:

```bash
npm run typecheck --workspace backend
npm run test --workspace backend
```

전체 타입체크:

```bash
npm run typecheck
npm run test
```

## 폴더 구조

```txt
backend/
  health.ts
  lib/
    supabase/server.ts
  utilities/
    index.ts
    _template/README.md
    <slug>/
      index.ts
      service.ts
      types.ts
```

## 백엔드 유틸 작성 규칙

백엔드가 필요한 유틸은 반드시 `backend/utilities/<slug>` 폴더 안에서 작업합니다.

좋은 구조:

```txt
backend/utilities/exchange-rate/
  index.ts    # route handler가 호출할 공개 함수
  service.ts  # 외부 API 호출, Supabase 쿼리, 계산 로직
  types.ts    # 이 유틸에서만 쓰는 타입
```

`index.ts` 예시:

```ts
import { getRates } from "./service";

export async function getExchangeRatePayload() {
  const rates = await getRates();

  return {
    rates,
    source: "backend/utilities/exchange-rate",
    timestamp: new Date().toISOString()
  };
}
```

그 다음 `backend/utilities/index.ts`에 slug 분기를 추가합니다.

```ts
case "exchange-rate":
  return getExchangeRatePayload();
```

## Supabase

서버 전용 Supabase helper:

```txt
backend/lib/supabase/server.ts
```

필요한 환경 변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용합니다.
- 클라이언트 컴포넌트에서 service role key를 읽거나 전달하지 않습니다.
- 브라우저에서 필요한 Supabase 접근은 `frontend/src/lib/supabase/browser.ts`를 사용합니다.

## 외부 API 사용 규칙

- API key는 `.env.local` 또는 Vercel Environment Variables에 둡니다.
- API key가 필요한 호출은 백엔드에서만 합니다.
- 실패 응답도 유틸별 `service.ts`에서 정리합니다.
- route handler에는 긴 로직을 쓰지 않습니다.

## Media Downloader

경로:

```txt
backend/utilities/media-downloader/
```

이 유틸은 서버에서 `yt-dlp`를 실행해 YouTube/Bilibili 공개 콘텐츠를 내려받고, `ffmpeg`를 통해 mp3/wav 변환을 수행합니다.

필요한 실행 환경:

```bash
yt-dlp
ffmpeg
```

필요한 환경 변수:

```bash
MEDIA_DOWNLOADER_ENABLED=true
YT_DLP_PATH=yt-dlp
YT_DLP_JS_RUNTIME=node
YT_DLP_SOCKET_TIMEOUT_SECONDS=30
YT_DLP_RETRIES=10
YT_DLP_FRAGMENT_RETRIES=10
YT_DLP_STALLED_TIMEOUT_MS=120000
YT_DLP_NO_OUTPUT_TIMEOUT_MS=1800000
MEDIA_DOWNLOAD_DIR=
```

`MEDIA_DOWNLOADER_ENABLED`가 `true`가 아니면 다운로드 요청은 거부됩니다. 기본 다운로드 위치는 Next.js 실행 cwd 기준 `.downloads/media`입니다.

제한:

- DRM 우회는 지원하지 않습니다.
- 비공개 콘텐츠 쿠키 추출은 지원하지 않습니다.
- 권한이 있는 공개 콘텐츠만 대상으로 합니다.
- Vercel 서버리스는 긴 다운로드 작업에 적합하지 않습니다.

## Codec Converter

경로:

```txt
backend/utilities/media-converter/
```

이 유틸은 업로드된 오디오/비디오 파일을 FFmpeg로 변환합니다.

필요한 실행 환경:

```bash
ffmpeg
```

필요한 환경 변수:

```bash
MEDIA_CONVERTER_ENABLED=true
FFMPEG_PATH=ffmpeg
MEDIA_CONVERT_DIR=
MEDIA_CONVERT_MAX_MB=512
```

지원 프로필:

- 오디오: MP1, MP2, MP3, AAC, M4A AAC, M4A ALAC, WAV PCM 16/24-bit, AIFF PCM, FLAC, Opus, Ogg Opus, Ogg Vorbis, Speex, AC-3, E-AC-3, DTS, WMA, WavPack, TTA, AMR-NB, AMR-WB, Codec 2, SBC, aptX, aptX HD, CAF ALAC, CAF PCM
- 비디오: MP4 H.264/AAC, MP4 H.264/Opus, MP4 H.265/AAC, MP4 AV1/AAC, MP4 H.266/AAC, WebM VP8/Vorbis, WebM VP8/Opus, WebM VP9/Opus, WebM AV1/Opus, MKV H.264/Opus, MKV H.265/FLAC, MKV VP9/Opus, MKV H.266/Opus, MOV ProRes/PCM, MOV H.264/AAC, AVI MPEG-4/MP3, AVI Motion JPEG/PCM, MPEG-1/MP2, MPEG-2/MP2, TS H.264/AAC, FLV H.264/AAC, ASF WMV/WMA, OGV Theora/Vorbis, MXF MPEG-2/PCM, MXF DNxHD/PCM, DV AVI, H.261, H.263, raw H.264, raw H.265
- 컨테이너 재래핑: MP4, MKV, WebM, MOV, MPEG-TS, AVI, OGG audio, MKA audio

주의:

- `MEDIA_CONVERTER_ENABLED`가 `true`가 아니면 변환 요청은 거부됩니다.
- 정보 API는 `ffmpegDetected`와 `ffmpegVersion`을 반환합니다. `FFMPEG_PATH`가 잘못되었거나 FFmpeg가 설치되지 않으면 화면에서 missing 상태로 표시됩니다.
- Opus는 `opus`, `ogg-opus`, `mp4-h264-opus`, `webm-vp8-opus`, `webm-vp9-opus`, `webm-av1-opus`, `mkv-h264-opus`, `mkv-vp9-opus`, `mkv-h266-opus` 프로필에서 지원합니다.
- `remux-*` 프로필은 `-c copy`를 사용하므로 빠르지만, 원본 코덱이 대상 컨테이너와 맞지 않으면 실패합니다.
- 모든 코덱의 완전한 상호 변환은 FFmpeg 빌드와 입력 파일 상태에 따라 달라집니다.
- Vercel 서버리스는 큰 파일 변환에 적합하지 않습니다. 큰 파일은 별도 워커/서버로 분리하는 것이 맞습니다.
