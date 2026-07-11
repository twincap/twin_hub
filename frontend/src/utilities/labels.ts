import type { UtilityStatus } from "@/utilities/types";

const statusLabels: Record<UtilityStatus, string> = {
  ready: "사용 가능",
  beta: "베타",
  planned: "준비 중"
};

export function getUtilityStatusLabel(status: UtilityStatus) {
  return statusLabels[status];
}
