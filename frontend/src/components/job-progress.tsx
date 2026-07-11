type JobProgressProps = {
  progress: number;
  status: string;
  runningLabel: string;
};

const pendingStatuses = new Set(["uploading", "requesting", "queued", "running"]);

export function JobProgress({ progress, status, runningLabel }: JobProgressProps) {
  const normalizedProgress = Math.max(0, Math.min(100, Math.floor(progress)));
  const hasKnownProgress = !pendingStatuses.has(status) || normalizedProgress >= 5;
  const progressText = hasKnownProgress ? `${normalizedProgress}%` : runningLabel;

  return (
    <div className="progress-row">
      <div
        aria-label="작업 진행률"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={hasKnownProgress ? normalizedProgress : undefined}
        aria-valuetext={progressText}
        className={hasKnownProgress ? "progress-track" : "progress-track indeterminate"}
        role="progressbar"
      >
        <div className="progress-fill" style={{ width: hasKnownProgress ? `${normalizedProgress}%` : "34%" }} />
      </div>
      <span>{progressText}</span>
    </div>
  );
}
