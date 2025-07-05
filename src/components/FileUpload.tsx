import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  diseases: string[];
  bloodPressure: string;
  bloodSugar: string;
  cholesterol: string;
}

// Mock AI analysis function
const analyzeReport = (file: File): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      const mockResults = [
        {
          diseases: ["Diabetes", "Hypertension"],
          bloodPressure: "150/100",
          bloodSugar: "245 mg/dL",
          cholesterol: "230 mg/dL"
        },
        {
          diseases: ["High Cholesterol", "Pre-diabetes"],
          bloodPressure: "140/90",
          bloodSugar: "125 mg/dL",
          cholesterol: "260 mg/dL"
        },
        {
          diseases: ["Normal Range"],
          bloodPressure: "120/80",
          bloodSugar: "95 mg/dL",
          cholesterol: "180 mg/dL"
        }
      ];
      
      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      resolve(randomResult);
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