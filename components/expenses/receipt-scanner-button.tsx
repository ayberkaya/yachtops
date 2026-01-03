"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { scanReceiptAction, ScanReceiptResult } from "@/actions/scan-receipt";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ScanningOverlay } from "./scanning-overlay";

interface ReceiptScannerButtonProps {
  onScanComplete: (data: ScanReceiptResult["data"]) => void;
  disabled?: boolean;
}

export function ReceiptScannerButton({
  onScanComplete,
  disabled = false,
}: ReceiptScannerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingSteps = [
    { progress: 0, message: "Uploading receipt image..." },
    { progress: 20, message: "Scanning receipt..." },
    { progress: 40, message: "Extracting text and numbers..." },
    { progress: 60, message: "Identifying items and prices..." },
    { progress: 80, message: "Verifying totals and matching items..." },
    { progress: 95, message: "Finalizing extraction..." },
    { progress: 100, message: "Complete!" },
  ];

  // Update current step based on progress
  useEffect(() => {
    if (progress < 20) {
      setCurrentStep(0);
    } else if (progress < 40) {
      setCurrentStep(1);
    } else if (progress < 60) {
      setCurrentStep(2);
    } else if (progress < 80) {
      setCurrentStep(3);
    } else if (progress < 95) {
      setCurrentStep(4);
    } else if (progress < 100) {
      setCurrentStep(5);
    } else {
      setCurrentStep(6);
    }
  }, [progress]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("Image size must be less than 10MB");
      return;
    }

    setIsLoading(true);
    setIsDialogOpen(true);
    setError(null);
    setProgress(0);
    setCurrentStep(0);

    // Create preview URL for the receipt image
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreviewUrl(previewUrl);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const next = prev + Math.random() * 10 + 2;
        return Math.min(next, 95);
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const result = await scanReceiptAction(formData);

      // Clear interval
      clearInterval(progressInterval);
      
      // Complete progress
      setProgress(100);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to scan receipt");
      }

      // Call the callback with the extracted data
      onScanComplete(result.data);

      // Close dialog after a short delay to show success
      setTimeout(() => {
        setIsDialogOpen(false);
        setIsLoading(false);
        setProgress(0);
        setCurrentStep(0);
        // Cleanup preview URL
        if (receiptPreviewUrl) {
          URL.revokeObjectURL(receiptPreviewUrl);
          setReceiptPreviewUrl(null);
        }
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 800);
    } catch (err) {
      console.error("Error scanning receipt:", err);
      clearInterval(progressInterval);
      // Cleanup preview URL on error
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
        setReceiptPreviewUrl(null);
      }
      setError(
        err instanceof Error ? err.message : "Could not read receipt. Please try again."
      );
      setIsLoading(false);
      setProgress(0);
      setCurrentStep(0);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={disabled || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Scan Receipt
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isLoading}
      />

      {/* Premium Scanning Overlay */}
      <ScanningOverlay
        isScanning={isLoading}
        progress={progress}
        receiptImageUrl={receiptPreviewUrl}
        onClose={() => {
          setIsDialogOpen(false);
          setIsLoading(false);
          if (receiptPreviewUrl) {
            URL.revokeObjectURL(receiptPreviewUrl);
            setReceiptPreviewUrl(null);
          }
        }}
      />

      {/* Error/Success Dialog (only shown when not scanning) */}
      <Dialog open={isDialogOpen && !isLoading} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{error ? "Error" : "Success"}</DialogTitle>
            <DialogDescription>
              {error ? "Failed to scan receipt" : "Receipt scanned successfully"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!error && (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Receipt scanned successfully!
                </p>
                <p className="text-xs text-muted-foreground">
                  Please review and correct the extracted information below.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


