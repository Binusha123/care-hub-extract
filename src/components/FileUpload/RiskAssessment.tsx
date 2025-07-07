import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface RiskAssessmentProps {
  riskLevel: string;
  riskPercentage: number;
}

export const RiskAssessment = ({ riskLevel, riskPercentage }: RiskAssessmentProps) => {
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getRiskColor(riskLevel)}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Risk Assessment
        </h4>
        <Badge variant={riskLevel.toLowerCase() === 'high' ? 'destructive' : 
                       riskLevel.toLowerCase() === 'moderate' ? 'secondary' : 'default'}>
          {riskLevel} Risk
        </Badge>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Risk Percentage</span>
          <span className="text-lg font-bold">{riskPercentage}%</span>
        </div>
        <Progress value={riskPercentage} className="h-2" />
      </div>
      <p className="text-sm">
        Based on the analysis, you have a <strong>{riskLevel.toLowerCase()}</strong> risk level 
        with a {riskPercentage}% probability of health complications.
      </p>
    </div>
  );
};