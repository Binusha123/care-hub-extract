import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertTriangle, CheckCircle, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  diseases: string[];
  bloodPressure: string;
  bloodSugar: string;
  cholesterol: string;
  riskLevel: string;
  riskPercentage: number;
  recommendations: string[];
}

// Mock AI analysis function with more realistic and varied results
const analyzeReport = (file: File): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Generate more realistic data based on file name or random factors
      const fileNameLower = file.name.toLowerCase();
      const isBloodTest = fileNameLower.includes('blood') || fileNameLower.includes('lab');
      const isCardiacTest = fileNameLower.includes('cardiac') || fileNameLower.includes('heart');
      const isDiabetesTest = fileNameLower.includes('diabetes') || fileNameLower.includes('sugar');
      
      // Generate varied realistic results
      const scenarios = [
        // High-risk scenario
        {
          diseases: ["Type 2 Diabetes", "Hypertension", "Hyperlipidemia"],
          bloodPressure: `${150 + Math.floor(Math.random() * 20)}/${95 + Math.floor(Math.random() * 15)}`,
          bloodSugar: `${200 + Math.floor(Math.random() * 100)} mg/dL`,
          cholesterol: `${250 + Math.floor(Math.random() * 50)} mg/dL`,
          riskLevel: "High",
          riskPercentage: 75 + Math.floor(Math.random() * 20),
          recommendations: [
            "Immediate consultation with endocrinologist required",
            "Start anti-diabetic medication as prescribed",
            "Strict dietary modifications needed",
            "Regular blood pressure monitoring essential"
          ]
        },
        // Moderate risk scenario
        {
          diseases: ["Pre-diabetes", "Mild Hypertension"],
          bloodPressure: `${130 + Math.floor(Math.random() * 15)}/${80 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${110 + Math.floor(Math.random() * 25)} mg/dL`,
          cholesterol: `${200 + Math.floor(Math.random() * 40)} mg/dL`,
          riskLevel: "Moderate",
          riskPercentage: 35 + Math.floor(Math.random() * 25),
          recommendations: [
            "Lifestyle modifications recommended",
            "Regular exercise and diet control",
            "Follow-up testing in 3 months",
            "Monitor blood pressure weekly"
          ]
        },
        // Low risk scenario
        {
          diseases: ["Normal Range", "Excellent Health"],
          bloodPressure: `${110 + Math.floor(Math.random() * 15)}/${70 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${80 + Math.floor(Math.random() * 20)} mg/dL`,
          cholesterol: `${150 + Math.floor(Math.random() * 30)} mg/dL`,
          riskLevel: "Low",
          riskPercentage: 5 + Math.floor(Math.random() * 15),
          recommendations: [
            "Continue current healthy lifestyle",
            "Annual health checkups recommended",
            "Maintain regular exercise routine",
            "Balanced diet maintenance"
          ]
        },
        // Cardiac risk scenario
        {
          diseases: ["Coronary Artery Disease Risk", "High Cholesterol"],
          bloodPressure: `${140 + Math.floor(Math.random() * 20)}/${90 + Math.floor(Math.random() * 10)}`,
          bloodSugar: `${95 + Math.floor(Math.random() * 15)} mg/dL`,
          cholesterol: `${240 + Math.floor(Math.random() * 40)} mg/dL`,
          riskLevel: "High",
          riskPercentage: 65 + Math.floor(Math.random() * 25),
          recommendations: [
            "Urgent cardiology consultation needed",
            "Cholesterol-lowering medication required",
            "Cardiac stress test recommended",
            "Immediate lifestyle changes essential"
          ]
        }
      ];
      
      // Select scenario based on file type or random
      let selectedScenario;
      if (isDiabetesTest) {
        selectedScenario = Math.random() > 0.6 ? scenarios[0] : scenarios[1];
      } else if (isCardiacTest) {
        selectedScenario = Math.random() > 0.5 ? scenarios[3] : scenarios[1];
      } else if (isBloodTest) {
        selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      } else {
        selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      }
      
      resolve(selectedScenario);
    }, 2000);
  });
};

const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to Supabase Storage (temporarily disabled)
      // const fileName = `${Date.now()}-${file.name}`;
      // const filePath = `reports/${user.id}/${fileName}`;
      
      setProgress(50);
      setUploading(false);
      setAnalyzing(true);

      // Analyze the file
      const analysis = await analyzeReport(file);
      setAnalysisResult(analysis);
      setProgress(100);

      toast({
        title: "Analysis Complete!",
        description: "Your medical report has been analyzed successfully.",
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1
  });

  const scheduleAppointment = () => {
    toast({
      title: "Appointment Requested",
      description: "Your appointment request has been sent to available doctors. You will be contacted soon.",
    });
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (condition: string) => {
    if (condition.toLowerCase().includes('normal')) return 'default';
    if (condition.toLowerCase().includes('diabetes') || condition.toLowerCase().includes('hypertension')) {
      return 'destructive';
    }
    return 'secondary';
  };

  const getVitalStatus = (vital: string, type: 'bp' | 'sugar' | 'cholesterol') => {
    if (type === 'bp') {
      const [systolic] = vital.split('/').map(Number);
      return systolic > 140 ? 'high' : systolic < 120 ? 'normal' : 'elevated';
    }
    if (type === 'sugar') {
      const value = parseInt(vital);
      return value > 200 ? 'high' : value < 100 ? 'normal' : 'elevated';
    }
    if (type === 'cholesterol') {
      const value = parseInt(vital);
      return value > 240 ? 'high' : value < 200 ? 'normal' : 'elevated';
    }
    return 'normal';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Medical Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop your medical report here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop your medical report</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <Button variant="outline">Choose File</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports PDF, DOCX, TXT, JPG, PNG files
                </p>
              </div>
            )}
          </div>

          {(uploading || analyzing) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">
                  {uploading ? "Uploading..." : "Analyzing..."}
                </span>
                <span className="text-sm">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {analysisResult && (
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
                {analysisResult.diseases.map((disease, index) => (
                  <Badge key={index} variant={getSeverityColor(disease)}>
                    {disease}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className={`p-4 rounded-lg border ${getRiskColor(analysisResult.riskLevel)}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Risk Assessment
                </h4>
                <Badge variant={analysisResult.riskLevel.toLowerCase() === 'high' ? 'destructive' : 
                               analysisResult.riskLevel.toLowerCase() === 'moderate' ? 'secondary' : 'default'}>
                  {analysisResult.riskLevel} Risk
                </Badge>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Risk Percentage</span>
                  <span className="text-lg font-bold">{analysisResult.riskPercentage}%</span>
                </div>
                <Progress value={analysisResult.riskPercentage} className="h-2" />
              </div>
              <p className="text-sm">
                Based on the analysis, you have a <strong>{analysisResult.riskLevel.toLowerCase()}</strong> risk level 
                with a {analysisResult.riskPercentage}% probability of health complications.
              </p>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold mb-3">Medical Recommendations</h4>
              <div className="space-y-2">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Appointment */}
            {analysisResult.riskLevel.toLowerCase() !== 'low' && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-primary mb-1">Consultation Recommended</h4>
                    <p className="text-sm text-muted-foreground">
                      Based on your risk level, we recommend scheduling an appointment with a doctor.
                    </p>
                  </div>
                  <Button onClick={scheduleAppointment} className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Appointment
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium">Blood Pressure</h5>
                  {getVitalStatus(analysisResult.bloodPressure, 'bp') === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-lg font-semibold">{analysisResult.bloodPressure}</p>
                <p className="text-xs text-muted-foreground">
                  {getVitalStatus(analysisResult.bloodPressure, 'bp')}
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium">Blood Sugar</h5>
                  {getVitalStatus(analysisResult.bloodSugar, 'sugar') === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-lg font-semibold">{analysisResult.bloodSugar}</p>
                <p className="text-xs text-muted-foreground">
                  {getVitalStatus(analysisResult.bloodSugar, 'sugar')}
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium">Cholesterol</h5>
                  {getVitalStatus(analysisResult.cholesterol, 'cholesterol') === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-lg font-semibold">{analysisResult.cholesterol}</p>
                <p className="text-xs text-muted-foreground">
                  {getVitalStatus(analysisResult.cholesterol, 'cholesterol')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;