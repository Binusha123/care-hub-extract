import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadDropzone } from "./UploadDropzone";
import { AnalysisProgress } from "./AnalysisProgress";
import { AnalysisResults } from "./AnalysisResults";
import { analyzeReport } from "./analyzeReport";
import { AnalysisResult } from "./types";

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
          <UploadDropzone 
            onDrop={onDrop} 
            disabled={uploading || analyzing} 
          />
          <AnalysisProgress 
            uploading={uploading}
            analyzing={analyzing}
            progress={progress}
          />
        </CardContent>
      </Card>

      {analysisResult && <AnalysisResults result={analysisResult} />}
    </div>
  );
};

export default FileUpload;