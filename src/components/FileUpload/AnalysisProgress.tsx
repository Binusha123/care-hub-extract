import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  uploading: boolean;
  analyzing: boolean;
  progress: number;
}

export const AnalysisProgress = ({ uploading, analyzing, progress }: AnalysisProgressProps) => {
  if (!uploading && !analyzing) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {uploading ? "Uploading..." : "Analyzing..."}
        </span>
        <span className="text-sm">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
};