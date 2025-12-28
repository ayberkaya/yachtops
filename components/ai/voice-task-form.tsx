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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";
import { TaskPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

interface VoiceTaskFormProps {
  users: { id: string; name: string | null; email: string; role?: any; customRoleId?: string | null; customRole?: { id: string; name: string } | null }[];
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
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50";
      case "High":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50";
      case "Medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
      case "Low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800/50";
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-hidden flex flex-col p-0 border-border/60 shadow-2xl">
        {/* Luxury Header with Gradient */}
        <DialogHeader className="relative px-8 pt-8 pb-6 border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
          
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20 shadow-sm">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">
                  Voice Task Assistant
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed max-w-lg">
                Create tasks effortlessly using natural language voice commands powered by advanced AI
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {!showTaskForm ? (
            <div className="px-0 py-0">
              <VoiceRecorder
                onTaskExtracted={handleTaskExtracted}
                onError={(error) => {
                  console.error("Voice recording error:", error);
                }}
              />

              {transcript && (
                <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 border border-border/50 backdrop-blur-sm shadow-premium-lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                      Transcript
                    </p>
                  </div>
                  <p className="text-[15px] text-foreground leading-relaxed font-medium">{transcript}</p>
                </div>
              )}
            </div>
          ) : extractedTask ? (
            <div className="px-8 py-8 space-y-8">
              {/* Luxury AI Analysis Result Card */}
              <div className="relative rounded-2xl border border-border/50 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.01] pointer-events-none" />
                
                <div className="relative px-6 py-5 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 border-b border-border/40 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/30 shadow-sm">
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground tracking-tight">Analysis Complete</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          Task parameters extracted successfully
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 border shadow-sm",
                        getPriorityColor(extractedTask.priority)
                      )}
                    >
                      {extractedTask.priority}
                    </Badge>
                  </div>
                </div>

                <div className="relative p-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                      Task Title
                    </p>
                    <p className="text-lg font-semibold text-foreground leading-snug">{extractedTask.title}</p>
                  </div>

                  {extractedTask.description && (
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                        Description
                      </p>
                      <p className="text-[15px] text-foreground leading-relaxed font-medium">
                        {extractedTask.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-5 pt-3 border-t border-border/30">
                    {extractedTask.assigneeId && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                          Assignee
                        </p>
                        <p className="text-[15px] font-semibold text-foreground">
                          {users.find((u) => u.id === extractedTask.assigneeId)?.name || "Not assigned"}
                        </p>
                      </div>
                    )}

                    {extractedTask.location && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                          Location
                        </p>
                        <p className="text-[15px] font-semibold text-foreground">{extractedTask.location}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Task Form with Premium Wrapper */}
              <div className="rounded-2xl border border-border/50 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
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
