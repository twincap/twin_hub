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

export const BROWSER_CONVERTER_MAX_MB = 256;

export const browserConvertProfiles = [
  audioProfile("mp3", "MP3 audio", "mp3", "MP3", "MP3", ["-vn", "-c:a", "libmp3lame", "-q:a", "2"]),
  audioProfile("aac-adts", "AAC ADTS", "aac", "ADTS", "AAC", ["-vn", "-c:a", "aac", "-b:a", "192k", "-f", "adts"]),
  audioProfile("m4a-aac", "M4A AAC", "m4a", "MPEG-4 Audio", "AAC", ["-vn", "-c:a", "aac", "-b:a", "192k"]),
  audioProfile("m4a-alac", "M4A ALAC", "m4a", "MPEG-4 Audio", "ALAC", ["-vn", "-c:a", "alac"]),
  audioProfile("wav-pcm-s16", "WAV PCM 16-bit", "wav", "WAV", "PCM s16le", ["-vn", "-c:a", "pcm_s16le"]),
  audioProfile("wav-pcm-s24", "WAV PCM 24-bit", "wav", "WAV", "PCM s24le", ["-vn", "-c:a", "pcm_s24le"]),
  audioProfile("aiff-pcm", "AIFF PCM", "aiff", "AIFF", "PCM s16be", ["-vn", "-c:a", "pcm_s16be"]),
  audioProfile("flac", "FLAC", "flac", "FLAC", "FLAC", ["-vn", "-c:a", "flac", "-compression_level", "8"]),
  audioProfile("opus", "Opus audio", "opus", "Ogg Opus", "Opus", ["-vn", "-c:a", "libopus", "-b:a", "160k", "-vbr", "on"]),
  audioProfile("ogg-opus", "Ogg Opus", "ogg", "Ogg", "Opus", ["-vn", "-c:a", "libopus", "-b:a", "160k", "-vbr", "on"]),
  audioProfile("ogg-vorbis", "Ogg Vorbis", "ogg", "Ogg", "Vorbis", ["-vn", "-c:a", "libvorbis", "-q:a", "5"]),
  audioProfile("ac3", "AC-3", "ac3", "AC-3", "AC-3", ["-vn", "-c:a", "ac3", "-b:a", "448k"]),

  videoProfile("mp4-h264-aac", "MP4 H.264 + AAC", "mp4", "MP4", "H.264", "AAC", ["-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-h264-opus", "MP4 H.264 + Opus", "mp4", "MP4", "H.264", "Opus", ["-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "libopus", "-b:a", "160k", "-strict", "-2", "-movflags", "+faststart"]),
  videoProfile("mp4-h265-aac", "MP4 H.265 + AAC", "mp4", "MP4", "H.265/HEVC", "AAC", ["-c:v", "libx265", "-preset", "fast", "-crf", "26", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("webm-vp8-opus", "WebM VP8 + Opus", "webm", "WebM", "VP8", "Opus", ["-c:v", "libvpx", "-crf", "12", "-b:v", "1M", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("webm-vp9-opus", "WebM VP9 + Opus", "webm", "WebM", "VP9", "Opus", ["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mkv-h264-opus", "MKV H.264 + Opus", "mkv", "Matroska", "H.264", "Opus", ["-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mkv-h265-flac", "MKV H.265 + FLAC", "mkv", "Matroska", "H.265/HEVC", "FLAC", ["-c:v", "libx265", "-preset", "fast", "-crf", "26", "-c:a", "flac"]),
  videoProfile("mov-prores-pcm", "MOV ProRes + PCM", "mov", "QuickTime", "Apple ProRes", "PCM", ["-c:v", "prores_ks", "-profile:v", "2", "-c:a", "pcm_s16le"]),
  videoProfile("avi-mpeg4-mp3", "AVI MPEG-4 + MP3", "avi", "AVI", "MPEG-4 Part 2", "MP3", ["-c:v", "mpeg4", "-q:v", "4", "-c:a", "libmp3lame", "-q:a", "3"]),
  videoProfile("mpeg1-mp2", "MPEG-1 Video + MP2", "mpg", "MPEG-PS", "MPEG-1 Video", "MP2", ["-c:v", "mpeg1video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("mpeg2-mp2", "MPEG-2 Video + MP2", "mpg", "MPEG-PS", "MPEG-2 Video", "MP2", ["-c:v", "mpeg2video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("ogv-theora-vorbis", "OGV Theora + Vorbis", "ogv", "Ogg", "Theora", "Vorbis", ["-c:v", "libtheora", "-q:v", "7", "-c:a", "libvorbis", "-q:a", "5"]),
  videoProfile("raw-h264", "Raw H.264 elementary stream", "h264", "Raw H.264", "H.264", undefined, ["-an", "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-f", "h264"]),
  videoProfile("raw-h265", "Raw H.265 elementary stream", "h265", "Raw H.265", "H.265/HEVC", undefined, ["-an", "-c:v", "libx265", "-preset", "fast", "-crf", "26", "-f", "hevc"]),

  containerProfile("remux-mp4", "Remux to MP4", "mp4", "MP4", ["-map", "0", "-c", "copy", "-movflags", "+faststart"]),
  containerProfile("remux-mkv", "Remux to MKV", "mkv", "Matroska", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-webm", "Remux to WebM", "webm", "WebM", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-mov", "Remux to MOV", "mov", "QuickTime", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-ts", "Remux to MPEG-TS", "ts", "MPEG-TS", ["-map", "0", "-c", "copy", "-f", "mpegts"]),
  containerProfile("remux-avi", "Remux to AVI", "avi", "AVI", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-ogg-audio", "Remux audio to OGG", "ogg", "Ogg", ["-map", "0:a:0", "-c:a", "copy", "-vn"]),
  containerProfile("remux-mka-audio", "Remux audio to MKA", "mka", "Matroska Audio", ["-map", "0:a:0", "-c:a", "copy", "-vn"])
] satisfies BrowserConvertProfile[];

export function buildBrowserOutputName(inputName: string, extension: string) {
  const extensionIndex = inputName.lastIndexOf(".");
  const nameWithoutExtension = extensionIndex > 0 ? inputName.slice(0, extensionIndex) : inputName;
  const base = nameWithoutExtension.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/[. ]+$/g, "");

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
    mkv: "video/x-matroska",
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
