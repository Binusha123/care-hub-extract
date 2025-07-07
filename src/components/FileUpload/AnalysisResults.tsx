import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { RiskAssessment } from "./RiskAssessment";
import { MedicalRecommendations } from "./MedicalRecommendations";
import { AppointmentScheduler } from "./AppointmentScheduler";
import { VitalStats } from "./VitalStats";

export interface AnalysisResult {
  diseases: string[];
  bloodPressure: string;
  bloodSugar: string;
  cholesterol: string;
  riskLevel: string;
  riskPercentage: number;
  recommendations: string[];
}

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export const AnalysisResults = ({ result }: AnalysisResultsProps) => {
  const getSeverityColor = (condition: string) => {
    if (condition.toLowerCase().includes('normal')) return 'default';
    if (condition.toLowerCase().includes('diabetes') || condition.toLowerCase().includes('hypertension')) {
      return 'destructive';
    }
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          AI Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Detected Conditions</h4>
          <div className="flex flex-wrap gap-2">
            {result.diseases.map((disease, index) => (
              <Badge key={index} variant={getSeverityColor(disease)}>
                {disease}
              </Badge>
            ))}
          </div>
        </div>

        <RiskAssessment 
          riskLevel={result.riskLevel} 
          riskPercentage={result.riskPercentage} 
        />

        <MedicalRecommendations recommendations={result.recommendations} />

        <AppointmentScheduler riskLevel={result.riskLevel} />

        <VitalStats 
          bloodPressure={result.bloodPressure}
          bloodSugar={result.bloodSugar}
          cholesterol={result.cholesterol}
        />
      </CardContent>
    </Card>
  );
};