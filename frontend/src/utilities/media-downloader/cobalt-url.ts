const cobaltHandoffBaseUrl = "https://cobalt.tools/#";

export function buildCobaltHandoffUrl(url: string) {
  return `${cobaltHandoffBaseUrl}${encodeURIComponent(url)}`;
}
