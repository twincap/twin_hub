export type BrowserConvertProfile = {
  id: string;
  label: string;
  kind: "audio" | "video" | "container";
  extension: string;
  container: string;
  audioCodec?: string;
  videoCodec?: string;
  notes: string;
  ffmpegArgs: string[];
};

export const BROWSER_CONVERTER_MAX_MB = 128;

// core 0.12.10 can trap in libopus because its WASM stack is too small; use FFmpeg's native encoder for the browser fallback.
const nativeOpusArgs = ["-c:a", "opus", "-strict", "-2", "-ar", "48000", "-ac", "2", "-b:a", "160k"];
const webVideoFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p";
const firstMediaStreams = ["-map", "0:v:0?", "-map", "0:a:0?", "-sn", "-dn"];

export const browserConvertProfiles = [
  audioProfile("mp3", "MP3 audio", "mp3", "MP3", "MP3", ["-vn", "-c:a", "libmp3lame", "-q:a", "2"]),
  audioProfile("aac-adts", "AAC ADTS", "aac", "ADTS", "AAC", ["-vn", "-c:a", "aac", "-b:a", "192k", "-f", "adts"]),
  audioProfile("m4a-aac", "M4A AAC", "m4a", "MPEG-4 Audio", "AAC", ["-vn", "-c:a", "aac", "-b:a", "192k"]),
  audioProfile("m4a-alac", "M4A ALAC", "m4a", "MPEG-4 Audio", "ALAC", ["-vn", "-c:a", "alac"]),
  audioProfile("wav-pcm-s16", "WAV PCM 16-bit", "wav", "WAV", "PCM s16le", ["-vn", "-c:a", "pcm_s16le"]),
  audioProfile("wav-pcm-s24", "WAV PCM 24-bit", "wav", "WAV", "PCM s24le", ["-vn", "-c:a", "pcm_s24le"]),
  audioProfile("aiff-pcm", "AIFF PCM", "aiff", "AIFF", "PCM s16be", ["-vn", "-c:a", "pcm_s16be"]),
  audioProfile("flac", "FLAC", "flac", "FLAC", "FLAC", ["-vn", "-c:a", "flac", "-compression_level", "8"]),
  audioProfile("opus", "Opus audio", "opus", "Ogg Opus", "Opus", ["-vn", ...nativeOpusArgs, "-f", "opus"]),
  audioProfile("ogg-opus", "Ogg Opus", "ogg", "Ogg", "Opus", ["-vn", ...nativeOpusArgs, "-f", "ogg"]),
  audioProfile("ogg-vorbis", "Ogg Vorbis", "ogg", "Ogg", "Vorbis", ["-vn", "-c:a", "libvorbis", "-q:a", "5"]),
  audioProfile("ac3", "AC-3", "ac3", "AC-3", "AC-3", ["-vn", "-c:a", "ac3", "-b:a", "448k"]),

  videoProfile("mp4-h264-aac", "MP4 H.264 + AAC", "mp4", "MP4", "H.264", "AAC", ["-vf", webVideoFilter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-h264-opus", "MP4 H.264 + Opus", "mp4", "MP4", "H.264", "Opus", ["-vf", webVideoFilter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", ...nativeOpusArgs, "-movflags", "+faststart"]),
  videoProfile("webm-vp8-opus", "WebM VP8 + Opus", "webm", "WebM", "VP8", "Opus", ["-vf", webVideoFilter, "-c:v", "libvpx", "-crf", "12", "-b:v", "1M", ...nativeOpusArgs]),
  videoProfile("mkv-h264-opus", "MKV H.264 + Opus", "mkv", "Matroska", "H.264", "Opus", ["-vf", webVideoFilter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", ...nativeOpusArgs]),
  videoProfile("avi-mpeg4-mp3", "AVI MPEG-4 + MP3", "avi", "AVI", "MPEG-4 Part 2", "MP3", ["-vf", webVideoFilter, "-c:v", "mpeg4", "-q:v", "4", "-c:a", "libmp3lame", "-q:a", "3"]),
  videoProfile("mpeg1-mp2", "MPEG-1 Video + MP2", "mpg", "MPEG-PS", "MPEG-1 Video", "MP2", ["-vf", webVideoFilter, "-r", "30", "-c:v", "mpeg1video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("mpeg2-mp2", "MPEG-2 Video + MP2", "mpg", "MPEG-PS", "MPEG-2 Video", "MP2", ["-vf", webVideoFilter, "-r", "30", "-c:v", "mpeg2video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("ogv-theora-vorbis", "OGV Theora + Vorbis", "ogv", "Ogg", "Theora", "Vorbis", ["-vf", webVideoFilter, "-c:v", "libtheora", "-q:v", "7", "-c:a", "libvorbis", "-q:a", "5"]),
  videoProfile("raw-h264", "Raw H.264 elementary stream", "h264", "Raw H.264", "H.264", undefined, ["-an", "-vf", webVideoFilter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-f", "h264"]),

  containerProfile("remux-mp4", "Remux to MP4", "mp4", "MP4", [...firstMediaStreams, "-c", "copy", "-movflags", "+faststart"]),
  containerProfile("remux-mkv", "Remux to MKV", "mkv", "Matroska", [...firstMediaStreams, "-c", "copy"]),
  containerProfile("remux-mov", "Remux to MOV", "mov", "QuickTime", [...firstMediaStreams, "-c", "copy"]),
  containerProfile("remux-ts", "Remux to MPEG-TS", "ts", "MPEG-TS", [...firstMediaStreams, "-c", "copy", "-f", "mpegts"]),
  containerProfile("remux-mka-audio", "Remux audio to MKA", "mka", "Matroska Audio", ["-map", "0:a:0", "-c:a", "copy", "-vn"])
] satisfies BrowserConvertProfile[];

export function buildBrowserOutputName(inputName: string, extension: string) {
  const extensionIndex = inputName.lastIndexOf(".");
  const nameWithoutExtension = extensionIndex > 0 ? inputName.slice(0, extensionIndex) : inputName;
  const normalized = nameWithoutExtension
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+/g, "")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/[. ]+$/g, "");
  const reservedSafe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(normalized) ? `_${normalized}` : normalized;
  const base = truncateUtf8(reservedSafe, 120);

  return `${base || "converted"}.${extension}`;
}

export function getBrowserOutputMimeType(extension: string) {
  const mimeTypes: Record<string, string> = {
    aac: "audio/aac",
    ac3: "audio/ac3",
    aiff: "audio/aiff",
    avi: "video/x-msvideo",
    flac: "audio/flac",
    h264: "video/h264",
    h265: "video/h265",
    m4a: "audio/mp4",
    mka: "audio/matroska",
    mkv: "video/matroska",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mpg: "video/mpeg",
    ogg: "audio/ogg",
    ogv: "video/ogg",
    opus: "audio/ogg",
    ts: "video/mp2t",
    wav: "audio/wav",
    webm: "video/webm"
  };

  return mimeTypes[extension.toLowerCase()] ?? "application/octet-stream";
}

function truncateUtf8(value: string, maxBytes: number) {
  const encoder = new TextEncoder();
  let result = "";

  for (const character of value) {
    if (encoder.encode(result + character).byteLength > maxBytes) {
      break;
    }
    result += character;
  }

  return result;
}

function audioProfile(
  id: string,
  label: string,
  extension: string,
  container: string,
  audioCodec: string,
  ffmpegArgs: string[]
): BrowserConvertProfile {
  return {
    id,
    label,
    kind: "audio",
    extension,
    container,
    audioCodec,
    notes: `${audioCodec} in ${container}`,
    ffmpegArgs
  };
}

function videoProfile(
  id: string,
  label: string,
  extension: string,
  container: string,
  videoCodec: string,
  audioCodec: string | undefined,
  ffmpegArgs: string[]
): BrowserConvertProfile {
  return {
    id,
    label,
    kind: "video",
    extension,
    container,
    videoCodec,
    audioCodec,
    notes: `${videoCodec}${audioCodec ? ` + ${audioCodec}` : ""} in ${container}`,
    ffmpegArgs
  };
}

function containerProfile(
  id: string,
  label: string,
  extension: string,
  container: string,
  ffmpegArgs: string[]
): BrowserConvertProfile {
  return {
    id,
    label,
    kind: "container",
    extension,
    container,
    notes: `Stream-copy remux into ${container}`,
    ffmpegArgs
  };
}
