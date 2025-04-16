import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, Loader2, FileText, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSummary(null);
    }
  };

  // Handle Upload & Summarization
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a document to upload",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process document");

      const data = await response.json();
      setSummary(data.summary);

      toast({
        title: "Document processed successfully",
        description: "Your document summary is ready",
      });
    } catch (error) {
      console.error("Error processing document:", error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Summary Download
  const handleDownload = () => {
    if (!summary) return;

    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.split(".")[0]}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Summary downloaded",
      description: "The document summary has been downloaded successfully",
    });
  };

  return (
    <Card className="w-full shadow-lg border-primary/10 hover:border-primary/30 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Document Upload & Summary
        </CardTitle>
        <CardDescription>
          Upload academic documents to generate a summarized analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <label htmlFor="document" className="text-sm font-medium">
            Upload Document
          </label>
          <Input
            id="document"
            type="file"
            accept=".txt,.pdf,.docx,.pptx"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Supported formats: TXT, PDF, DOCX, PPTX</p>
        </div>

        {file && (
          <div className="bg-muted/30 p-3 rounded-md">
            <p className="text-sm font-medium">Selected file:</p>
            <p className="text-sm">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
          </div>
        )}

        {summary && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Document Summary</h3>
            <Textarea value={summary} readOnly className="h-[200px] overflow-auto" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleUpload} disabled={!file || isProcessing} className="flex-1">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          {isProcessing ? "Processing..." : "Process Document"}
        </Button>
        {summary && (
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download Summary
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default DocumentUpload;
