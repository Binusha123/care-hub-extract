import { CheckCircle } from "lucide-react";

interface MedicalRecommendationsProps {
  recommendations: string[];
}

export const MedicalRecommendations = ({ recommendations }: MedicalRecommendationsProps) => {
  return (
    <div>
      <h4 className="font-semibold mb-3">Medical Recommendations</h4>
      <div className="space-y-2">
        {recommendations.map((recommendation, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-blue-800">{recommendation}</span>
          </div>
        ))}
      </div>
    </div>
  );
};