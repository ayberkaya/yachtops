"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Sparkles, Brain, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

      // Notify user that recording has started
      toast({
        title: "Kayıt Başladı",
        description: "Sesiniz kaydediliyor. Kaydı durdurmak için butona tekrar tıklayın.",
        variant: "default",
        duration: 3000,
      });

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
    <div className="relative inline-flex flex-col items-center justify-center mx-auto gap-3">
      {/* AI Powered Badge - Always visible */}
      {!isRecording && !isProcessing && (
        <Badge 
          variant="outline" 
          className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 shadow-sm backdrop-blur-sm z-10"
        >
          <Brain className="w-3 h-3 mr-1 text-primary" />
          <span className="font-semibold text-primary">AI Powered</span>
        </Badge>
      )}

      {/* Premium Recording Indicator - When recording */}
      {isRecording && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30">
          <div className="relative rounded-lg px-3 py-1.5 bg-gradient-to-r from-primary/95 via-primary to-primary/95 border border-primary/50 shadow-lg shadow-primary/20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-red-500/40 animate-ping" />
                </div>
              </div>
              <span className="text-xs font-semibold text-primary-foreground whitespace-nowrap">
                Kayıt Alınıyor
              </span>
            </div>
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-lg bg-primary/20 animate-pulse blur-sm -z-10" />
          </div>
        </div>
      )}

      <div className="relative inline-flex items-center justify-center">
        {/* Premium sparkle effect - always visible when not recording */}
        {!isRecording && !isProcessing && (
          <div className="absolute -top-1.5 -right-1.5 z-20">
            <div className="relative">
              <Sparkles className="w-4.5 h-4.5 text-primary animate-pulse" />
              <div className="absolute inset-0">
                <Sparkles className="w-4.5 h-4.5 text-primary/70 animate-ping opacity-75" />
              </div>
            </div>
          </div>
        )}
        
        {/* Subtle pulsing ring when recording - draws attention without being intrusive */}
        {isRecording && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse" 
            style={{ 
              animationDuration: '2s',
              width: 'calc(100% + 16px)',
              height: 'calc(100% + 16px)',
              margin: '-8px',
            }} 
          />
        )}
        
        {/* Premium glow effect when not recording */}
        {!isRecording && !isProcessing && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 blur-sm animate-pulse" />
        )}
        
        <Button
          type="button"
          onClick={handleClick}
          disabled={disabled || isProcessing}
          variant={isRecording ? "default" : "outline"}
          size="icon"
          className={cn(
            "relative transition-all duration-300 rounded-full",
            "w-[50px] h-[50px] p-0",
            isRecording && "h-[60px]",
            "border-premium shadow-premium",
            isRecording && [
              "bg-gradient-to-br from-primary via-primary to-primary/90",
              "text-primary-foreground",
              "shadow-lg shadow-primary/40",
              "ring-2 ring-primary/40",
              "animate-pulse-scale",
              "cursor-pointer",
              "hover:scale-110 hover:ring-2 hover:ring-primary/60 hover:shadow-xl hover:shadow-primary/50",
              "active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            ],
            !isRecording && [
              "bg-gradient-to-br from-background via-background to-muted/30",
              "border-primary/30 dark:border-primary/40",
              "hover:bg-gradient-to-br hover:from-muted/50 hover:via-background hover:to-muted/40",
              "hover:border-primary/50 dark:hover:border-primary/60",
              "hover:shadow-premium-lg hover:shadow-primary/10",
              "hover:scale-105"
            ],
            className
          )}
        >
          {isProcessing ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : isRecording ? (
            <div className="relative flex flex-col items-center justify-center gap-1">
              {/* Sound waves animation */}
              <div className="flex items-end gap-0.5 h-5">
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-1" style={{ height: '40%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-2" style={{ height: '60%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-3" style={{ height: '80%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-4" style={{ height: '100%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-3" style={{ height: '80%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-2" style={{ height: '60%' }} />
                <div className="w-0.5 bg-current rounded-full animate-sound-wave-1" style={{ height: '40%' }} />
              </div>
              {/* Minimal "Tap to Stop" text inside button */}
              <div className="text-[8px] font-bold text-primary-foreground/90 leading-none tracking-tight animate-pulse">
                STOP
              </div>
            </div>
          ) : (
            <Mic className="size-6 text-primary" />
          )}
          <span className="sr-only">Voice Task (Premium)</span>
        </Button>
      </div>
    </div>
  );
}

