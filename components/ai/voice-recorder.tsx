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
      setErrorMessage("Your browser does not support audio recording");
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
          setErrorMessage("No audio recorded");
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
          : "Microphone access denied. Please enable permissions in your browser settings."
      );
      setIsRecording(false);
      if (onError) {
        onError(errorMessage || "Failed to start recording");
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
        setErrorMessage(result.error || "Failed to extract task");
        if (onError) {
          onError(result.error || "Failed to extract task");
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setStatus("error");
      const errorMsg = error instanceof Error ? error.message : "Error processing audio";
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
    <div className={cn("flex flex-col items-center gap-10 py-8", className)}>
      {/* Luxury Microphone Button with Premium Effects */}
      <div className="relative">
        {/* Elegant pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary/25 animate-ping" style={{ width: '140px', height: '140px', margin: '-30px' }} />
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping" style={{ width: '140px', height: '140px', margin: '-30px', animationDelay: '0.5s' }} />
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ width: '140px', height: '140px', margin: '-30px', animationDelay: '1s' }} />
          </>
        )}
        
        <Button
          onClick={handleClick}
          disabled={disabled || isProcessing || status === "success"}
          size="lg"
          className={cn(
            "relative w-[168px] h-[159px] rounded-full p-0 transition-all duration-500 ease-out",
            "bg-gradient-to-br from-primary via-primary to-primary/90",
            "hover:from-primary/95 hover:via-primary hover:to-primary/85",
            "text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "border-2 border-primary/20",
            "hover:scale-105 active:scale-95",
            isRecording && "scale-110 shadow-[0_12px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.5)] ring-4 ring-primary/20",
            status === "success" && "bg-gradient-to-br from-green-600 via-green-600 to-green-700 border-green-500/30 shadow-[0_8px_32px_rgba(34,197,94,0.3)]",
            status === "error" && "bg-gradient-to-br from-destructive via-destructive to-destructive/90 border-destructive/30"
          )}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm m-0" />
          
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin relative z-10" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-10 h-10 relative z-10" />
          ) : status === "error" ? (
            <XCircle className="w-10 h-10 relative z-10" />
          ) : isRecording ? (
            <Square className="w-10 h-10 fill-current relative z-10" />
          ) : (
            <Mic className="w-10 h-10 relative z-10" />
          )}
        </Button>
      </div>

      {/* Luxury Status Display */}
      <div className="flex flex-col items-center gap-5 min-h-[120px] w-full max-w-lg">
        {isRecording && (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500/10 via-red-500/8 to-red-500/10 border border-red-500/25 backdrop-blur-md shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-[0.15em]">
                Recording
              </span>
            </div>
            <div className="text-5xl font-bold text-foreground tracking-tight tabular-nums font-mono">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-muted-foreground text-center font-medium">
              Click again to stop recording
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/8 to-primary/10 border border-primary/25 backdrop-blur-md shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-semibold text-foreground uppercase tracking-[0.15em]">
                Processing
              </span>
            </div>
            <div className="flex gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '0s' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-sm" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed font-medium">
              Analyzing audio signal and extracting task parameters...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 animate-fade-in w-full">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500/10 via-green-500/8 to-green-500/10 border border-green-500/25 backdrop-blur-md shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-[0.15em]">
                Task Ready
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex flex-col items-center gap-3 animate-fade-in max-w-sm text-center w-full">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-destructive/10 via-destructive/8 to-destructive/10 border border-destructive/25 backdrop-blur-md shadow-sm">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-xs font-semibold text-destructive uppercase tracking-[0.15em]">
                Error
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {errorMessage}
            </p>
          </div>
        )}

        {!isRecording && !isProcessing && status === "idle" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in text-center w-full">
            <div className="px-6 py-3 rounded-xl bg-gradient-to-br from-muted/60 via-muted/50 to-muted/60 border border-border/50 backdrop-blur-md shadow-sm">
              <p className="text-sm font-semibold text-foreground uppercase tracking-[0.15em]">
                Ready
              </p>
            </div>
            <p className="text-[15px] text-muted-foreground max-w-md leading-relaxed font-medium">
              Click the microphone button and speak your task. Our AI will analyze and create it automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
