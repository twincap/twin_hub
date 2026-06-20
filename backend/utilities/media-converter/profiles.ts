import type { MediaConvertProfile } from "./types";

export const mediaConvertProfiles = [
  audioProfile("mp1", "MP1 audio", "mp1", "MP1", "MP1", ["-vn", "-c:a", "mp1", "-b:a", "192k"]),
  audioProfile("mp2", "MP2 audio", "mp2", "MP2", "MP2", ["-vn", "-c:a", "mp2", "-b:a", "224k"]),
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
  audioProfile("speex", "Speex", "spx", "Ogg Speex", "Speex", ["-vn", "-c:a", "libspeex", "-q:a", "8"]),
  audioProfile("ac3", "AC-3", "ac3", "AC-3", "AC-3", ["-vn", "-c:a", "ac3", "-b:a", "448k"]),
  audioProfile("eac3", "E-AC-3", "eac3", "E-AC-3", "E-AC-3", ["-vn", "-c:a", "eac3", "-b:a", "640k"]),
  audioProfile("dts", "DTS", "dts", "DTS", "DTS", ["-vn", "-c:a", "dca", "-b:a", "768k"]),
  audioProfile("wma", "WMA v2", "wma", "ASF", "WMA v2", ["-vn", "-c:a", "wmav2", "-b:a", "192k"]),
  audioProfile("wavpack", "WavPack", "wv", "WavPack", "WavPack", ["-vn", "-c:a", "wavpack"]),
  audioProfile("tta", "TTA", "tta", "TTA", "TTA", ["-vn", "-c:a", "tta"]),
  audioProfile("amr-nb", "AMR-NB", "amr", "AMR", "AMR-NB", ["-vn", "-ar", "8000", "-ac", "1", "-c:a", "libopencore_amrnb", "-b:a", "12.2k"]),
  audioProfile("amr-wb", "AMR-WB", "amr", "AMR", "AMR-WB", ["-vn", "-ar", "16000", "-ac", "1", "-c:a", "libvo_amrwbenc", "-b:a", "23.85k"]),
  audioProfile("codec2", "Codec 2", "c2", "Codec 2", "Codec 2", ["-vn", "-ar", "8000", "-ac", "1", "-c:a", "libcodec2"]),
  audioProfile("sbc", "Bluetooth SBC", "sbc", "Raw SBC", "SBC", ["-vn", "-c:a", "sbc", "-f", "sbc"]),
  audioProfile("aptx", "Bluetooth aptX", "aptx", "Raw aptX", "aptX", ["-vn", "-c:a", "aptx", "-f", "aptx"]),
  audioProfile("aptx-hd", "Bluetooth aptX HD", "aptxhd", "Raw aptX HD", "aptX HD", ["-vn", "-c:a", "aptx_hd", "-f", "aptx_hd"]),
  audioProfile("caf-alac", "CAF ALAC", "caf", "Core Audio", "ALAC", ["-vn", "-c:a", "alac"]),
  audioProfile("caf-pcm", "CAF PCM", "caf", "Core Audio", "PCM s24le", ["-vn", "-c:a", "pcm_s24le"]),

  videoProfile("mp4-h264-aac", "MP4 H.264 + AAC", "mp4", "MP4", "H.264", "AAC", ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-h264-opus", "MP4 H.264 + Opus", "mp4", "MP4", "H.264", "Opus", ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "libopus", "-b:a", "160k", "-strict", "-2", "-movflags", "+faststart"]),
  videoProfile("mp4-h265-aac", "MP4 H.265 + AAC", "mp4", "MP4", "H.265/HEVC", "AAC", ["-c:v", "libx265", "-preset", "medium", "-crf", "24", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-av1-aac", "MP4 AV1 + AAC", "mp4", "MP4", "AV1", "AAC", ["-c:v", "libaom-av1", "-crf", "32", "-b:v", "0", "-cpu-used", "4", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-av1-svt-aac", "MP4 AV1 SVT + AAC", "mp4", "MP4", "AV1", "AAC", ["-c:v", "libsvtav1", "-crf", "32", "-preset", "8", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("mp4-h266-aac", "MP4 H.266/VVC + AAC", "mp4", "MP4", "H.266/VVC", "AAC", ["-c:v", "libvvenc", "-preset", "medium", "-qp", "32", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]),
  videoProfile("webm-vp8-vorbis", "WebM VP8 + Vorbis", "webm", "WebM", "VP8", "Vorbis", ["-c:v", "libvpx", "-crf", "10", "-b:v", "1M", "-c:a", "libvorbis", "-q:a", "5"]),
  videoProfile("webm-vp8-opus", "WebM VP8 + Opus", "webm", "WebM", "VP8", "Opus", ["-c:v", "libvpx", "-crf", "10", "-b:v", "1M", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("webm-vp9-opus", "WebM VP9 + Opus", "webm", "WebM", "VP9", "Opus", ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("webm-av1-opus", "WebM AV1 + Opus", "webm", "WebM", "AV1", "Opus", ["-c:v", "libaom-av1", "-crf", "34", "-b:v", "0", "-cpu-used", "4", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mkv-h264-opus", "MKV H.264 + Opus", "mkv", "Matroska", "H.264", "Opus", ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mkv-h265-flac", "MKV H.265 + FLAC", "mkv", "Matroska", "H.265/HEVC", "FLAC", ["-c:v", "libx265", "-preset", "medium", "-crf", "24", "-c:a", "flac"]),
  videoProfile("mkv-vp9-opus", "MKV VP9 + Opus", "mkv", "Matroska", "VP9", "Opus", ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mkv-h266-opus", "MKV H.266/VVC + Opus", "mkv", "Matroska", "H.266/VVC", "Opus", ["-c:v", "libvvenc", "-preset", "medium", "-qp", "32", "-c:a", "libopus", "-b:a", "160k"]),
  videoProfile("mov-prores-pcm", "MOV ProRes + PCM", "mov", "QuickTime", "Apple ProRes", "PCM", ["-c:v", "prores_ks", "-profile:v", "3", "-c:a", "pcm_s16le"]),
  videoProfile("mov-h264-aac", "MOV H.264 + AAC", "mov", "QuickTime", "H.264", "AAC", ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k"]),
  videoProfile("avi-mpeg4-mp3", "AVI MPEG-4 + MP3", "avi", "AVI", "MPEG-4 Part 2", "MP3", ["-c:v", "mpeg4", "-q:v", "4", "-c:a", "libmp3lame", "-q:a", "3"]),
  videoProfile("avi-mjpeg-pcm", "AVI Motion JPEG + PCM", "avi", "AVI", "Motion JPEG", "PCM", ["-c:v", "mjpeg", "-q:v", "3", "-c:a", "pcm_s16le"]),
  videoProfile("mpeg1-mp2", "MPEG-1 Video + MP2", "mpg", "MPEG-PS", "MPEG-1 Video", "MP2", ["-c:v", "mpeg1video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("mpeg2-mp2", "MPEG-2 Video + MP2", "mpg", "MPEG-PS", "MPEG-2 Video", "MP2", ["-c:v", "mpeg2video", "-q:v", "4", "-c:a", "mp2", "-b:a", "224k", "-f", "mpeg"]),
  videoProfile("ts-h264-aac", "TS H.264 + AAC", "ts", "MPEG-TS", "H.264", "AAC", ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-f", "mpegts"]),
  videoProfile("flv-h264-aac", "FLV H.264 + AAC", "flv", "FLV", "H.264", "AAC", ["-c:v", "libx264", "-preset", "medium", "-crf", "22", "-c:a", "aac", "-b:a", "128k", "-f", "flv"]),
  videoProfile("asf-wmv-wma", "ASF WMV + WMA", "wmv", "ASF", "WMV2", "WMA v2", ["-c:v", "wmv2", "-b:v", "2M", "-c:a", "wmav2", "-b:a", "192k"]),
  videoProfile("ogv-theora-vorbis", "OGV Theora + Vorbis", "ogv", "Ogg", "Theora", "Vorbis", ["-c:v", "libtheora", "-q:v", "7", "-c:a", "libvorbis", "-q:a", "5"]),
  videoProfile("mxf-mpeg2-pcm", "MXF MPEG-2 + PCM", "mxf", "MXF", "MPEG-2 Video", "PCM", ["-c:v", "mpeg2video", "-b:v", "50M", "-minrate", "50M", "-maxrate", "50M", "-bufsize", "17825792", "-pix_fmt", "yuv422p", "-c:a", "pcm_s16le", "-f", "mxf"]),
  videoProfile("mxf-dnxhd-pcm", "MXF DNxHD + PCM", "mxf", "MXF", "DNxHD", "PCM", ["-c:v", "dnxhd", "-b:v", "120M", "-pix_fmt", "yuv422p", "-c:a", "pcm_s16le", "-f", "mxf"]),
  videoProfile("dv-avi-pcm", "DV AVI + PCM", "avi", "AVI", "DV Video", "PCM", ["-target", "ntsc-dv"]),
  videoProfile("h261-mov", "MOV H.261 + PCM", "mov", "QuickTime", "H.261", "PCM", ["-c:v", "h261", "-c:a", "pcm_s16le"]),
  videoProfile("h263-3gp", "3GP H.263 + AAC", "3gp", "3GPP", "H.263", "AAC", ["-c:v", "h263", "-c:a", "aac", "-b:a", "96k"]),
  videoProfile("raw-h264", "Raw H.264 elementary stream", "h264", "Raw H.264", "H.264", undefined, ["-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-f", "h264"]),
  videoProfile("raw-h265", "Raw H.265 elementary stream", "h265", "Raw H.265", "H.265/HEVC", undefined, ["-an", "-c:v", "libx265", "-preset", "medium", "-crf", "24", "-f", "hevc"]),

  containerProfile("remux-mp4", "Remux to MP4", "mp4", "MP4", ["-map", "0", "-c", "copy", "-movflags", "+faststart"]),
  containerProfile("remux-mkv", "Remux to MKV", "mkv", "Matroska", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-webm", "Remux to WebM", "webm", "WebM", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-mov", "Remux to MOV", "mov", "QuickTime", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-ts", "Remux to MPEG-TS", "ts", "MPEG-TS", ["-map", "0", "-c", "copy", "-f", "mpegts"]),
  containerProfile("remux-avi", "Remux to AVI", "avi", "AVI", ["-map", "0", "-c", "copy"]),
  containerProfile("remux-ogg-audio", "Remux audio to OGG", "ogg", "Ogg", ["-map", "0:a:0", "-c:a", "copy", "-vn"]),
  containerProfile("remux-mka-audio", "Remux audio to MKA", "mka", "Matroska Audio", ["-map", "0:a:0", "-c:a", "copy", "-vn"])
] satisfies MediaConvertProfile[];

export function getMediaConvertProfile(profileId: string) {
  return mediaConvertProfiles.find((profile) => profile.id === profileId);
}

function audioProfile(
  id: string,
  label: string,
  extension: string,
  container: string,
  audioCodec: string,
  ffmpegArgs: string[]
): MediaConvertProfile {
  return {
    id,
    label,
    kind: "audio",
    extension,
    container,
    audioCodec,
    notes: `${audioCodec} in ${container}. Requires matching FFmpeg encoder support.`,
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
): MediaConvertProfile {
  return {
    id,
    label,
    kind: "video",
    extension,
    container,
    videoCodec,
    audioCodec,
    notes: `${videoCodec}${audioCodec ? ` + ${audioCodec}` : ""} in ${container}. Requires matching FFmpeg encoder support.`,
    ffmpegArgs
  };
}

function containerProfile(
  id: string,
  label: string,
  extension: string,
  container: string,
  ffmpegArgs: string[]
): MediaConvertProfile {
  return {
    id,
    label,
    kind: "container",
    extension,
    container,
    notes: `Stream-copy remux into ${container}. Fast, but it only works when the source codecs are allowed by that container.`,
    ffmpegArgs
  };
}
