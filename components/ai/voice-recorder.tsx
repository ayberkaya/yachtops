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
    <div className={cn("flex flex-col items-center gap-6 py-8", className)}>
      {/* AI Assistant Visual Indicator */}
      <div className="relative">
        {/* Outer pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-ping" style={{ width: '140px', height: '140px', margin: '-10px' }} />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 animate-ping" style={{ width: '140px', height: '140px', margin: '-10px', animationDelay: '0.5s' }} />
          </>
        )}
        
        {/* Main microphone button */}
        <Button
          onClick={handleClick}
          disabled={disabled || isProcessing || status === "success"}
          size="lg"
          className={cn(
            "relative rounded-full w-24 h-24 p-0 transition-all duration-300 shadow-2xl",
            "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500",
            "hover:from-blue-600 hover:via-purple-600 hover:to-pink-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isRecording && "scale-110 shadow-blue-500/50",
            status === "success" && "bg-gradient-to-br from-green-500 to-emerald-500",
            status === "error" && "bg-gradient-to-br from-red-500 to-rose-500"
          )}
        >
          <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin text-white relative z-10" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-8 h-8 text-white relative z-10" />
          ) : status === "error" ? (
            <XCircle className="w-8 h-8 text-white relative z-10" />
          ) : isRecording ? (
            <Square className="w-8 h-8 text-white relative z-10 fill-white" />
          ) : (
            <Mic className="w-8 h-8 text-white relative z-10" />
          )}
        </Button>
      </div>

      {/* Status Messages */}
      <div className="flex flex-col items-center gap-3 min-h-[80px]">
        {isRecording && (
          <div className="flex flex-col items-center gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Dinliyorum...
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              Durdurmak için tekrar tıklayın
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Analiz Ediyor...
              </span>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Sesiniz işleniyor ve görev çıkarılıyor
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                Görev Hazırlandı!
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex flex-col items-center gap-2 animate-fade-in max-w-xs text-center">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                Hata
              </span>
            </div>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              {errorMessage}
            </p>
          </div>
        )}

        {!isRecording && !isProcessing && status === "idle" && (
          <div className="flex flex-col items-center gap-2 animate-fade-in text-center">
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              AI Asistanınız Hazır
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Mikrofon butonuna basıp görevinizi söyleyin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

