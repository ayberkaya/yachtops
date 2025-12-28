"use client";

import { useState, useEffect, useRef } from "react";
import { VoiceRecorder } from "./voice-recorder";
import { TaskIntentResult } from "@/lib/ai/types";
import { TaskForm } from "@/components/tasks/task-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Mic } from "lucide-react";
import { TaskPriority, UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

interface VoiceTaskFormProps {
  users: { id: string; name: string | null; email: string; role?: UserRole; customRoleId?: string | null; customRole?: { id: string; name: string } | null }[];
  trips: { id: string; name: string }[];
  onSuccess: (createdTask?: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceTaskForm({
  users,
  trips,
  onSuccess,
  open,
  onOpenChange,
}: VoiceTaskFormProps) {
  const [extractedTask, setExtractedTask] = useState<TaskIntentResult | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const handleTaskExtracted = (taskIntent: TaskIntentResult, transcriptText: string) => {
    setExtractedTask(taskIntent);
    setTranscript(transcriptText);
    setShowTaskForm(true);
  };

  const handleTaskFormSuccess = (createdTask?: any) => {
    setExtractedTask(null);
    setTranscript(null);
    setShowTaskForm(false);
    onOpenChange(false);
    onSuccess(createdTask);
  };

  const handleClose = () => {
    setExtractedTask(null);
    setTranscript(null);
    setShowTaskForm(false);
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-500";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Convert AI priority to Prisma TaskPriority
  const mapPriority = (priority: string): TaskPriority => {
    switch (priority) {
      case "Critical":
        return "URGENT";
      case "High":
        return "HIGH";
      case "Medium":
        return "MEDIUM";
      case "Low":
        return "LOW";
      default:
        return "MEDIUM";
    }
  };

  // Convert TaskIntentResult to TaskForm initial data
  const getTaskFormData = () => {
    if (!extractedTask) return undefined;

    return {
      title: extractedTask.title,
      description: extractedTask.description || transcript || "",
      assigneeId: extractedTask.assigneeId || null,
      priority: mapPriority(extractedTask.priority),
      dueDate: extractedTask.dueDate || null,
      status: "TODO" as const,
      type: "GENERAL" as const,
    };
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 pointer-events-none" />
        
        <div className="relative">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Sesli Asistan
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Görevinizi söyleyin, AI otomatik oluştursun
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!showTaskForm ? (
            <div className="px-6 py-8">
              <VoiceRecorder
                onTaskExtracted={handleTaskExtracted}
                onError={(error) => {
                  console.error("Voice recording error:", error);
                }}
              />

              {transcript && (
                <div className="mt-6 w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/50 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Transkript</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{transcript}</p>
                </div>
              )}
            </div>
          ) : extractedTask ? (
          <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* AI Extraction Preview */}
            <div className="p-5 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-blue-950/40 dark:via-purple-950/30 dark:to-pink-950/40 rounded-xl border border-blue-200/50 dark:border-blue-800/50 shadow-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">AI Analiz Sonucu</h3>
                </div>
                <Badge className={cn("text-white font-semibold shadow-md", getPriorityColor(extractedTask.priority))}>
                  {extractedTask.priority}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Başlık</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{extractedTask.title}</p>
                </div>

                {extractedTask.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Açıklama</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {extractedTask.description}
                    </p>
                  </div>
                )}

                {extractedTask.assigneeId && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Atanan</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {users.find((u) => u.id === extractedTask.assigneeId)?.name || "Bilinmiyor"}
                    </p>
                  </div>
                )}

                {extractedTask.location && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Lokasyon</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{extractedTask.location}</p>
                  </div>
                )}

                {extractedTask.adminNote && (
                  <div className="p-3 bg-yellow-100/80 dark:bg-yellow-900/30 rounded-lg border border-yellow-300/50 dark:border-yellow-800/50">
                    <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">AI Notu</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      {extractedTask.adminNote}
                    </p>
                  </div>
                )}

                {!extractedTask.isTaskIntent && (
                  <div className="p-3 bg-orange-100/80 dark:bg-orange-900/30 rounded-lg border border-orange-300/50 dark:border-orange-800/50">
                    <p className="text-xs text-orange-800 dark:text-orange-300 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Bu mesaj bir görev içermiyor gibi görünüyor.</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Task Form */}
            <div className="pt-2">
              <TaskForm
                task={undefined}
                initialData={{
                  title: extractedTask.title,
                  description: extractedTask.description || transcript || "",
                  assigneeId: extractedTask.assigneeId || null,
                  priority: mapPriority(extractedTask.priority),
                  dueDate: extractedTask.dueDate || null,
                }}
                users={users}
                trips={trips}
                onSuccess={handleTaskFormSuccess}
              />
            </div>
          </div>
        ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

