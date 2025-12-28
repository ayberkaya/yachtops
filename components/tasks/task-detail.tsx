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
import { ArrowLeft, User, Ship, Calendar, CheckCircle2, MessageSquare, Paperclip, Upload, X, Pencil, Download, Eye, Camera, Check } from "lucide-react";
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
  createdBy: { id: string; name: string | null; email: string } | null;
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
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

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
      } else if (response.status === 403) {
        // User doesn't have permission to view this task
        router.push("/dashboard/tasks");
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
      [TaskStatus.DONE]: "default",
    };

    return (
      <Badge variant={variants[status]}>
        {status === TaskStatus.DONE ? "Completed" : "To-Do"}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: TaskPriority | string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      NORMAL: "secondary",
      HIGH: "default",
      URGENT: "destructive",
    };

    const priorityStr = typeof priority === "string" ? priority : priority;
    const isUrgent = priorityStr === "URGENT";
    const isNormal = priorityStr === "NORMAL";
    
    return (
      <Badge 
        variant={variants[priorityStr] || "secondary"}
        className={isUrgent ? "urgent-blink" : isMedium ? "bg-amber-200 text-[#2b303b]" : ""}
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

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
      alert('Only JPG, JPEG, and PNG images are allowed.');
      e.target.value = '';
      return;
    }

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
          mimeType: file.type || "image/jpeg",
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

  const handleMarkAsCompleted = async () => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: TaskStatus.DONE }),
      });

      if (response.ok) {
        fetchTask();
      }
    } catch (error) {
      console.error("Error marking task as completed:", error);
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
            <div className="flex flex-col items-end gap-2">
              {getPriorityBadge(task.priority)}
              {getStatusBadge(task.status)}
            </div>
          </div>
        </div>
        {/* Edit button for mobile - hidden on desktop */}
        {canManage && task && (
          <div className="md:hidden">
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
                  onDelete={() => {
                    setIsEditing(false);
                    router.push("/dashboard/tasks");
                    router.refresh();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </span>
                    </Button>
                  </Label>
                  <Label htmlFor="camera-upload" className="cursor-pointer">
                    <Button variant="outline" size="icon" type="button">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </Label>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingAttachment}
                />
                <Input
                  id="camera-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingAttachment}
                />
              </div>

              <div className="space-y-2">
                {task.attachments.map((attachment) => {
                  const isImage = attachment.mimeType?.startsWith("image/") || 
                                  /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(attachment.fileName);
                  
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (isImage) {
                          setPreviewAttachment(attachment);
                        } else {
                          window.open(attachment.fileUrl, "_blank");
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {attachment.fileName}
                            </span>
                            {isImage && (
                              <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement("a");
                            link.href = attachment.fileUrl;
                            link.download = attachment.fileName;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(attachment.id);
                            }}
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {task.attachments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attachments yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar - Edit button and task info for desktop */}
        <div className="space-y-6">
          {canManage && task && (
            <div className="hidden md:block">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
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
                        onDelete={() => {
                          setIsEditing(false);
                          router.push("/dashboard/tasks");
                          router.refresh();
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Task Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.assignee && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Assigned to</p>
                    <p className="text-sm text-muted-foreground">
                      {task.assignee.name || task.assignee.email}
                    </p>
                  </div>
                </div>
              )}
              {task.assigneeRole && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Assigned to role</p>
                    <p className="text-sm text-muted-foreground">{task.assigneeRole}</p>
                  </div>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Due date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(task.dueDate), "PPP")}
                    </p>
                  </div>
                </div>
              )}
              {task.trip && (
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Trip</p>
                    <p className="text-sm text-muted-foreground">{task.trip.name}</p>
                  </div>
                </div>
              )}
              {task.createdBy && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created by</p>
                    <p className="text-sm text-muted-foreground">
                      {task.createdBy.name || task.createdBy.email}
                    </p>
                  </div>
                </div>
              )}
              {task.completedBy && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Completed by</p>
                    <p className="text-sm text-muted-foreground">
                      {task.completedBy.name || task.completedBy.email}
                    </p>
                    {task.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.completedAt), "PPP 'at' p")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark as Completed Button */}
      {task.status !== TaskStatus.DONE && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleMarkAsCompleted}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="lg"
            style={{
              boxShadow: "0px 0px 0px 0px rgba(0, 0, 0, 0), 0px 0px 0px 0px rgba(0, 0, 0, 0), 0px 0px 0px 0px rgba(0, 0, 0, 0), 0px 0px 0px 0px rgba(0, 0, 0, 0), 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1), 0px 4px 12px 0px rgba(0, 0, 0, 0.15)"
            }}
          >
            Mark as Completed
            <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" showCloseButton={false}>
          {previewAttachment && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="truncate">{previewAttachment.fileName}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {previewAttachment.fileSize
                        ? `${(previewAttachment.fileSize / 1024).toFixed(1)} KB`
                        : "Unknown size"} • {format(new Date(previewAttachment.createdAt), "MMM d, yyyy")} • {previewAttachment.user.name || previewAttachment.user.email}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = previewAttachment.fileUrl;
                        link.download = previewAttachment.fileName;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewAttachment(null)}
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-6 pb-6 overflow-auto max-h-[calc(90vh-120px)]">
                {previewAttachment.fileName.toLowerCase().endsWith('.heic') || 
                 previewAttachment.fileName.toLowerCase().endsWith('.heif') ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      HEIC format is not supported for preview in browsers.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = previewAttachment.fileUrl;
                        link.download = previewAttachment.fileName;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to view
                    </Button>
                  </div>
                ) : (
                  <img
                    src={previewAttachment.fileUrl}
                    alt={previewAttachment.fileName}
                    className="max-w-full h-auto rounded-lg"
                    onError={(e) => {
                      // If image fails to load, show error message
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.error-message')) {
                        target.style.display = "none";
                        const errorDiv = document.createElement("div");
                        errorDiv.className = "error-message text-center py-8 text-muted-foreground";
                        errorDiv.textContent = "Failed to load image preview";
                        parent.appendChild(errorDiv);
                      }
                    }}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

