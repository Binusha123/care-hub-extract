import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface UploadDropzoneProps {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
}

export const UploadDropzone = ({ onDrop, disabled }: UploadDropzoneProps) => {
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
    maxFiles: 1,
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <Button variant="outline" disabled={disabled}>Choose File</Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supports PDF, DOCX, TXT, JPG, PNG files
          </p>
        </div>
      )}
    </div>
  );
};