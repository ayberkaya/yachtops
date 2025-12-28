"use client";

import { useState } from "react";
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
import { CheckCircle2, X } from "lucide-react";
import { TaskPriority, UserRole } from "@prisma/client";

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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sesli Görev Oluştur</DialogTitle>
          <DialogDescription>
            Mikrofon butonuna basıp görevinizi söyleyin. AI görevinizi analiz edip otomatik olarak oluşturacak.
          </DialogDescription>
        </DialogHeader>

        {!showTaskForm ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <VoiceRecorder
              onTaskExtracted={handleTaskExtracted}
              onError={(error) => {
                console.error("Voice recording error:", error);
              }}
            />

            {transcript && (
              <div className="w-full p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Transkript:</p>
                <p className="text-sm text-muted-foreground">{transcript}</p>
              </div>
            )}
          </div>
        ) : extractedTask ? (
          <div className="space-y-4">
            {/* AI Extraction Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">AI Analiz Sonucu</h3>
                <Badge className={getPriorityColor(extractedTask.priority)}>
                  {extractedTask.priority}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Başlık:</p>
                <p className="text-sm">{extractedTask.title}</p>
              </div>

              {extractedTask.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Açıklama:</p>
                  <p className="text-sm text-muted-foreground">
                    {extractedTask.description}
                  </p>
                </div>
              )}

              {extractedTask.assigneeId && (
                <div>
                  <p className="text-sm font-medium mb-1">Atanan:</p>
                  <p className="text-sm">
                    {users.find((u) => u.id === extractedTask.assigneeId)?.name || "Bilinmiyor"}
                  </p>
                </div>
              )}

              {extractedTask.location && (
                <div>
                  <p className="text-sm font-medium mb-1">Lokasyon:</p>
                  <p className="text-sm">{extractedTask.location}</p>
                </div>
              )}

              {extractedTask.adminNote && (
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                  <p className="text-xs font-medium mb-1">AI Notu:</p>
                  <p className="text-xs text-muted-foreground">
                    {extractedTask.adminNote}
                  </p>
                </div>
              )}

              {!extractedTask.isTaskIntent && (
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Bu mesaj bir görev içermiyor gibi görünüyor.
                  </p>
                </div>
              )}
            </div>

            {/* Task Form */}
            <div className="max-h-[60vh] overflow-y-auto">
              <TaskForm
                task={getTaskFormData()}
                users={users}
                trips={trips}
                onSuccess={handleTaskFormSuccess}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

