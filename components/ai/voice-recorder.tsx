"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeVoiceCommand } from "@/actions/analyze-voice-command";
import { TaskIntentResult } from "@/lib/ai/types";

interface VoiceRecorderProps {
  onTaskExtracted?: (taskIntent: TaskIntentResult, transcript: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceRecorder({
  onTaskExtracted,
  onError,
  className,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Tarayıcınız ses kaydını desteklemiyor");
      setStatus("error");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setStatus("recording");
      setIsRecording(true);
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setStatus("error");
          setErrorMessage("Kayıt alınamadı");
          setIsRecording(false);
          return;
        }

        // Process the audio
        await processAudio();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin."
      );
      setIsRecording(false);
      if (onError) {
        onError(errorMessage || "Kayıt başlatılamadı");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const processAudio = async () => {
    setIsProcessing(true);
    setStatus("processing");

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      // Convert to File for FormData
      const audioFile = new File([audioBlob], "voice-command.webm", {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioFile);

      const result = await analyzeVoiceCommand(formData);

      if (result.success && result.data) {
        setStatus("success");
        if (onTaskExtracted && result.transcript) {
          onTaskExtracted(result.data, result.transcript);
        }
        
        // Reset after 2 seconds
        setTimeout(() => {
          setStatus("idle");
          setRecordingTime(0);
        }, 2000);
      } else {
        setStatus("error");
        setErrorMessage(result.error || "Görev çıkarılamadı");
        if (onError) {
          onError(result.error || "Görev çıkarılamadı");
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setStatus("error");
      const errorMsg = error instanceof Error ? error.message : "Ses işlenirken hata oluştu";
      setErrorMessage(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing && status !== "success") {
      startRecording();
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        onClick={handleClick}
        disabled={disabled || isProcessing || status === "success"}
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className={cn(
          "rounded-full w-16 h-16 p-0 transition-all",
          isRecording && "animate-pulse",
          status === "success" && "bg-green-600 hover:bg-green-700",
          status === "error" && "bg-red-600 hover:bg-red-700"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : status === "error" ? (
          <XCircle className="w-6 h-6" />
        ) : isRecording ? (
          <Square className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>

      {isRecording && (
        <div className="text-sm text-muted-foreground">
          {formatTime(recordingTime)}
        </div>
      )}

      {isProcessing && (
        <div className="text-sm text-muted-foreground">
          Ses işleniyor...
        </div>
      )}

      {status === "success" && (
        <div className="text-sm text-green-600 dark:text-green-400">
          Görev oluşturuldu!
        </div>
      )}

      {errorMessage && (
        <div className="text-sm text-red-600 dark:text-red-400 max-w-xs text-center">
          {errorMessage}
        </div>
      )}

      {!isRecording && !isProcessing && status === "idle" && (
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          Mikrofon butonuna basıp görevinizi söyleyin
        </div>
      )}
    </div>
  );
}

