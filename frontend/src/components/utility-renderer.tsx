import MediaConverterUtility from "@/utilities/media-converter/page";
import MediaDownloaderUtility from "@/utilities/media-downloader/page";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityRendererProps = {
  utility: UtilityDefinition;
};

export function UtilityRenderer({ utility }: UtilityRendererProps) {
  switch (utility.slug) {
    case "media-converter":
      return <MediaConverterUtility />;
    case "media-downloader":
      return <MediaDownloaderUtility />;
    default:
      return (
        <div className="empty-state">
          <span>{utility.name} is not connected yet.</span>
        </div>
      );
  }
}
