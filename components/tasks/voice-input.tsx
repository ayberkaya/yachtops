"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeVoiceCommand } from "@/actions/voice-task";
import { TaskIntentResult } from "@/lib/ai/types";
import { useToast } from "@/components/ui/toast";

interface VoiceInputProps {
  onSuccess?: (data: TaskIntentResult, transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceInput({
  onSuccess,
  className,
  disabled = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Tarayıcı Desteği",
          description: "Bu tarayıcı ses kaydını desteklemiyor. Lütfen modern bir tarayıcı kullanın.",
          variant: "error",
        });
        return;
      }

      setIsRecording(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Try to use webm, fallback to default
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ""; // Use default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          toast({
            title: "Kayıt Hatası",
            description: "Ses kaydı alınamadı. Lütfen tekrar deneyin.",
            variant: "error",
          });
          return;
        }

        // Process the audio
        await processAudio();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      
      // Handle specific error types
      let errorMessage = "Mikrofon erişimi reddedildi.";
      let errorTitle = "Mikrofon Erişimi";

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
          case "PermissionDeniedError":
            errorMessage = "Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin ve sayfayı yenileyin.";
            break;
          case "NotFoundError":
          case "DevicesNotFoundError":
            errorMessage = "Mikrofon bulunamadı. Lütfen bir mikrofon cihazının bağlı olduğundan emin olun.";
            break;
          case "NotReadableError":
          case "TrackStartError":
            errorMessage = "Mikrofon başka bir uygulama tarafından kullanılıyor. Lütfen diğer uygulamaları kapatın ve tekrar deneyin.";
            break;
          case "OverconstrainedError":
          case "ConstraintNotSatisfiedError":
            errorMessage = "Mikrofon ayarları desteklenmiyor. Lütfen farklı bir mikrofon deneyin.";
            break;
          default:
            errorMessage = error.message || "Mikrofon erişimi sağlanamadı. Lütfen tarayıcı ayarlarını kontrol edin.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "error",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudio = async () => {
    setIsProcessing(true);

    try {
      // Determine the blob type based on what was recorded
      const blobType = audioChunksRef.current.length > 0 
        ? (audioChunksRef.current[0].type || "audio/webm")
        : "audio/webm";

      const audioBlob = new Blob(audioChunksRef.current, { type: blobType });

      // Convert to File for FormData
      const audioFile = new File([audioBlob], "voice-command.webm", {
        type: blobType,
      });

      const formData = new FormData();
      formData.append("audio", audioFile);

      const result = await analyzeVoiceCommand(formData);

      if (result.success && result.data) {
        toast({
          title: "Ses Analizi Tamamlandı",
          description: "Form otomatik olarak dolduruldu. Lütfen kontrol edip kaydedin.",
          variant: "success",
        });

        if (onSuccess && result.transcript) {
          onSuccess(result.data, result.transcript);
        }
      } else {
        // Determine error title based on error message
        let errorTitle = "Analiz Hatası";
        const errorMsg = (result.error || "").toLowerCase();
        
        if (
          errorMsg.includes("api anahtarı") ||
          errorMsg.includes("api key") ||
          errorMsg.includes("yapılandırılmamış")
        ) {
          errorTitle = "Yapılandırma Hatası";
        } else if (errorMsg.includes("yetkilendirme") || errorMsg.includes("unauthorized")) {
          errorTitle = "Yetkilendirme Hatası";
        } else if (errorMsg.includes("limit") || errorMsg.includes("rate")) {
          errorTitle = "Limit Aşıldı";
        }
        
        toast({
          title: errorTitle,
          description: result.error || "Ses işlenirken bir hata oluştu.",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Hata",
        description:
          error instanceof Error
            ? error.message
            : "Ses işlenirken beklenmeyen bir hata oluştu.",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing && !disabled) {
      startRecording();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        className={cn(
          "relative transition-all",
          isRecording && "animate-pulse"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span className="hidden sm:inline">Yapay Zeka Analiz Ediyor...</span>
            <span className="sm:hidden">Analiz Ediliyor...</span>
          </>
        ) : isRecording ? (
          <>
            <Mic className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Dinliyorum...</span>
            <span className="sm:hidden">Kayıt</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Sesli Görev</span>
            <span className="sm:hidden">Ses</span>
          </>
        )}
      </Button>

      {isRecording && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="hidden sm:inline">Kayıt devam ediyor...</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="hidden sm:inline">AI analiz ediyor...</span>
        </div>
      )}
    </div>
  );
}

