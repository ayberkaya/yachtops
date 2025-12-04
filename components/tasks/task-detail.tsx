"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskStatus, TaskPriority, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { ArrowLeft, User, Ship, Calendar, CheckCircle2, MessageSquare, Paperclip, Upload, X, Pencil } from "lucide-react";
import { TaskForm } from "./task-form";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  assigneeRole: UserRole | null;
  completedBy: { id: string; name: string | null; email: string } | null;
  completedAt: string | null;
  trip: { id: string; name: string } | null;
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface TaskDetailProps {
  taskId: string;
  users: { id: string; name: string | null; email: string }[];
  trips: { id: string; name: string }[];
  currentUser: { id: string; role: UserRole };
}

export function TaskDetail({ taskId, users, trips, currentUser }: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const canManage = currentUser.role !== "CREW";

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data);
      }
    } catch (error) {
      console.error("Error fetching task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, "default" | "secondary" | "outline"> = {
      [TaskStatus.TODO]: "outline",
      [TaskStatus.IN_PROGRESS]: "secondary",
      [TaskStatus.DONE]: "default",
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: TaskPriority | string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "outline",
      MEDIUM: "secondary",
      HIGH: "default",
      URGENT: "destructive",
    };

    const priorityStr = typeof priority === "string" ? priority : priority;
    const isUrgent = priorityStr === "URGENT";
    
    return (
      <Badge 
        variant={variants[priorityStr] || "secondary"}
        className={isUrgent ? "urgent-blink" : ""}
        style={isUrgent ? { animation: "blinkRed 1s ease-in-out infinite" } : undefined}
      >
        {priorityStr}
      </Badge>
    );
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        setCommentText("");
        fetchTask();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    try {
      // In a real app, you'd upload to S3/cloud storage first
      // For now, we'll use a placeholder URL
      const fileUrl = URL.createObjectURL(file);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (response.ok) {
        fetchTask();
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTask();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete attachment");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert("Failed to delete attachment");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading task...
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Task not found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}
          </div>
        </div>
        {canManage && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>Update task details</DialogDescription>
              </DialogHeader>
              <TaskForm
                task={task}
                users={users}
                trips={trips}
                onSuccess={() => {
                  setIsEditing(false);
                  fetchTask();
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  size="sm"
                >
                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                </Button>
              </div>

              <div className="space-y-4">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
                {task.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </span>
                  </Button>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingAttachment}
                />
              </div>

              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {attachment.fileName}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {attachment.fileSize
                              ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                              : "Unknown size"}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(attachment.createdAt), "MMM d, yyyy")}
                          </span>
                          <span>•</span>
                          <span>{attachment.user.name || attachment.user.email}</span>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {task.attachments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attachments yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {task.assignee.name || task.assignee.email}
                  </span>
                </div>
              ) : task.assigneeRole ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.assigneeRole}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                </div>
              )}

              {task.trip && (
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.trip.name}</span>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {task.completedBy && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div className="text-sm">
                    <div>Completed by {task.completedBy.name || task.completedBy.email}</div>
                    {task.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(task.completedAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

