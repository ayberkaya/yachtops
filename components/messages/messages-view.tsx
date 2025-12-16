"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Send, Hash, Users, Menu, Image as ImageIcon, X, Search, Pin, Reply, Edit2, Trash2, Paperclip, FileText, Download, ChevronDown, Star, Forward, Check, CheckCheck, Bell, Settings } from "lucide-react";
import { ChannelList } from "./channel-list";
import { ChannelForm } from "./channel-form";
import { canManageUsers } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Message {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  isPinned?: boolean;
  parentMessageId?: string | null;
  parentMessage?: Message | null;
  replies?: Message[];
  attachments?: MessageAttachment[];
  channel?: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  reads?: {
    userId: string;
    readAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isGeneral: boolean;
  members: User[];
  createdBy: { id: string; name: string | null; email: string } | null;
  _count?: { messages: number };
}

interface MessagesViewProps {
  initialChannels: Channel[];
  allUsers: User[];
  currentUser: {
    id: string;
    role: string;
  };
}

export function MessagesView({ initialChannels, allUsers, currentUser }: MessagesViewProps) {
  const { data: session } = useSession();
  const [channels, setChannels] = useState(initialChannels);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    initialChannels[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showReadBy, setShowReadBy] = useState<string | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    desktopEnabled: true,
    soundEnabled: true,
    mentionEnabled: true,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const canManage = canManageUsers(session?.user || null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      fetchPinnedMessages();
      // Mark channel as read when selected
      if (selectedChannel.id) {
        const now = new Date().toISOString();
        setLastReadTimes((prev) => ({
          ...prev,
          [selectedChannel.id]: now,
        }));
        setUnreadCounts((prev) => ({
          ...prev,
          [selectedChannel.id]: 0,
        }));
      }
    }
  }, [selectedChannel]);

  // Initialize unread counts for all channels on mount
  useEffect(() => {
    channels.forEach((channel) => {
      if (channel.id !== selectedChannel?.id) {
        fetchUnreadCount(channel.id);
      }
    });
  }, [channels.length]); // Only run when channels change

  // Fetch notification preferences on mount
  useEffect(() => {
    fetchNotificationPreferences();
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll for new messages - smart polling: only when tab is visible and user is active
  useEffect(() => {
    // Only poll if messages view is visible (user is on messages page)
    if (!selectedChannel && channels.length === 0) {
      return;
    }

    let interval: NodeJS.Timeout | null = null;
    let lastActivity = Date.now();
    const POLL_INTERVAL = 20000; // 20 seconds - reduced frequency
    const INACTIVE_POLL_INTERVAL = 60000; // 1 minute when inactive

    const handleActivity = () => {
      lastActivity = Date.now();
    };

    const startPolling = () => {
      if (interval) clearInterval(interval);
      
      const poll = () => {
        // Only poll if tab is visible
        if (document.hidden) return;
        
        const isActive = Date.now() - lastActivity < 30000; // Active if user interacted in last 30s
        const currentInterval = isActive ? POLL_INTERVAL : INACTIVE_POLL_INTERVAL;
        
        // Update all channels' unread counts
        channels.forEach((channel) => {
          if (channel.id !== selectedChannel?.id) {
            fetchUnreadCount(channel.id);
          }
        });
        
        // Update current channel messages if selected
        if (selectedChannel) {
          fetchMessages(selectedChannel.id, true);
        }
      };

      poll(); // Initial poll
      interval = setInterval(poll, POLL_INTERVAL);
    };

    // Track user activity
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    startPolling();

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [selectedChannel, channels]);

  // Check for new messages and show notifications
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only notify if it's a new message (not the one we just sent) and from different channel
      if (lastMessage.id !== lastMessageIdRef.current && 
          lastMessage.user.id !== currentUser.id) {
        
        // Get current user info
        const currentUserInfo = allUsers.find(u => u.id === currentUser.id);
        const userEmail = session?.user?.email || currentUserInfo?.email || "";
        const userName = currentUserInfo?.name || "";
        const emailPrefix = userEmail.split("@")[0];
        
        // Check if message contains @mention of current user
        const isMentioned = lastMessage.content && (
          (userName && lastMessage.content.includes(`@${userName}`)) ||
          (userEmail && lastMessage.content.includes(`@${userEmail}`)) ||
          (emailPrefix && lastMessage.content.includes(`@${emailPrefix}`))
        );
        
        // Only notify if:
        // 1. It's a mention and mention notifications are enabled, OR
        // 2. It's from a different channel (not currently viewing)
        const shouldNotify = isMentioned 
          ? notificationPreferences.mentionEnabled 
          : lastMessage.channel?.id !== selectedChannel?.id;
        
        if (!shouldNotify) {
          lastMessageIdRef.current = lastMessage.id;
          return;
        }
        
        lastMessageIdRef.current = lastMessage.id;
        
        // Get channel name for notification
        const messageChannel = lastMessage.channel || channels.find(ch => ch.id === lastMessage.channel?.id);
        const channelName = messageChannel?.name || "Unknown";
        
        // Show desktop notification
        if (notificationPreferences.desktopEnabled && "Notification" in window && Notification.permission === "granted") {
          const senderName = lastMessage.user.name || lastMessage.user.email;
          const notificationTitle = isMentioned ? `@${senderName} mentioned you` : `New message in #${channelName}`;
          
          new Notification(notificationTitle, {
            body: `${senderName}: ${lastMessage.content || "Sent an attachment"}`,
            icon: "/favicon.ico",
            tag: lastMessage.id,
            requireInteraction: !!isMentioned, // Require interaction for mentions
          });
        }
        
        // Play sound notification
        if (notificationPreferences.soundEnabled) {
          playNotificationSound();
        }
      }
    }
  }, [messages, notificationPreferences, selectedChannel, currentUser]);

  const fetchNotificationPreferences = async () => {
    try {
      const response = await fetch("/api/notifications/preferences");
      if (response.ok) {
        const prefs = await response.json();
        setNotificationPreferences(prefs);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    }
  };

  const updateNotificationPreferences = async (updates: Partial<typeof notificationPreferences>) => {
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const prefs = await response.json();
        setNotificationPreferences(prefs);
      }
    } catch (error) {
      console.error("Error updating notification preferences:", error);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const fetchMessages = async (channelId: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`/api/messages?channelId=${channelId}`);
      if (response.ok) {
        const data = await response.json();
        const previousLength = messages.length;
        setMessages(data);
        
        // Scroll to bottom if new messages were added (during polling)
        if (silent && data.length > previousLength && channelId === selectedChannel?.id) {
          setTimeout(() => scrollToBottom(true), 100);
        }
        
        // Update last read time for current channel
        if (channelId === selectedChannel?.id) {
          const now = new Date().toISOString();
          setLastReadTimes((prev) => ({
            ...prev,
            [channelId]: now,
          }));
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: 0,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchUnreadCount = async (channelId: string) => {
    try {
      const response = await fetch(`/api/messages?channelId=${channelId}`);
      if (response.ok) {
        const allMessages = await response.json();
        const lastReadTime = lastReadTimes[channelId];
        
        if (lastReadTime) {
          const unreadMessages = allMessages.filter(
            (msg: Message) => 
              new Date(msg.createdAt) > new Date(lastReadTime) &&
              msg.user.id !== currentUser.id
          );
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: unreadMessages.length,
          }));
        } else if (allMessages.length > 0) {
          // First time viewing - count all messages except own
          const unreadMessages = allMessages.filter(
            (msg: Message) => msg.user.id !== currentUser.id
          );
          setUnreadCounts((prev) => ({
            ...prev,
            [channelId]: unreadMessages.length,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        // Reset input value to allow selecting the same file again
        e.target.value = "";
      } else {
        alert("Please select an image file");
        e.target.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendMessage = async (isReply = false, parentId?: string) => {
    const messageContent = isReply ? editingContent : newMessage;
    if ((!messageContent.trim() && !selectedImage && selectedFiles.length === 0) || !selectedChannel || isSending) return;

    // Check access before sending
    if (!hasChannelAccess(selectedChannel)) {
      alert("You don't have access to this channel");
      return;
    }

    setIsSending(true);
    try {
      let response: Response;

      if (isReply && parentId) {
        // Send reply
        const formData = new FormData();
        if (messageContent.trim()) {
          formData.append("content", messageContent.trim());
        }
        if (selectedImage) {
          formData.append("image", selectedImage);
        }

        response = await fetch(`/api/messages/${parentId}/replies`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const message = await response.json();
          // Update parent message with new reply
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === parentId
                ? { ...msg, replies: [...(msg.replies || []), message] }
                : msg
            )
          );
          setNewMessage("");
          setEditingContent("");
          setSelectedImage(null);
          setImagePreview(null);
          setSelectedFiles([]);
          setReplyingToMessageId(null);
          setEditingMessageId(null);
          // Scroll to bottom immediately after sending message
          setTimeout(() => scrollToBottom(true), 50);
          // Update channel message count
          setChannels((prev) =>
            prev.map((ch) =>
              ch.id === selectedChannel.id
                ? { 
                    ...ch, 
                    _count: { 
                      messages: (ch._count?.messages || 0) + 1 
                    } 
                  }
                : ch
            )
          );
        } else {
          // Handle error response
          let errorMessage = "Failed to send reply";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
            console.error("Failed to send reply:", errorData);
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            errorMessage = `Failed to send reply (Status: ${response.status})`;
          }
          alert(errorMessage);
        }
        return; // Early return to avoid duplicate processing
      } else if (selectedImage || selectedFiles.length > 0) {
        // Send with FormData for image/files
        const formData = new FormData();
        formData.append("channelId", selectedChannel.id);
        if (messageContent.trim()) {
          formData.append("content", messageContent.trim());
        }
        if (selectedImage) {
          formData.append("image", selectedImage);
        }
        // Add files to FormData so API can detect them
        selectedFiles.forEach((file) => {
          formData.append("file", file);
        });

        response = await fetch("/api/messages", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const message = await response.json();
          
          // If message was created and we have files, upload them as attachments
          if (selectedFiles.length > 0) {
            try {
              // Upload files as attachments
              for (const file of selectedFiles) {
                await handleUploadAttachment(message.id, file);
              }
              // Re-fetch message to get attachments
              const updatedResponse = await fetch(`/api/messages/${message.id}`);
              if (updatedResponse.ok) {
                const updatedMessage = await updatedResponse.json();
                setMessages((prev) => [...prev, updatedMessage]);
              } else {
                // If re-fetch fails, still add the original message
                setMessages((prev) => [...prev, message]);
              }
            } catch (attachmentError) {
              console.error("Error uploading attachments:", attachmentError);
              // Still add the message even if attachments fail
              setMessages((prev) => [...prev, message]);
            }
          } else {
            // No files to upload, just add the message
            setMessages((prev) => [...prev, message]);
          }
          
          setNewMessage("");
          setEditingContent("");
          setSelectedImage(null);
          setImagePreview(null);
          setSelectedFiles([]);
          setReplyingToMessageId(null);
          setEditingMessageId(null);
          // Scroll to bottom immediately after sending message
          setTimeout(() => scrollToBottom(true), 50);
          // Update channel message count
          setChannels((prev) =>
            prev.map((ch) =>
              ch.id === selectedChannel.id
                ? { 
                    ...ch, 
                    _count: { 
                      messages: (ch._count?.messages || 0) + 1 
                    } 
                  }
                : ch
            )
          );
        } else {
          // Handle error response
          let errorMessage = `Failed to send message (Status: ${response.status})`;
          try {
            const text = await response.text();
            console.error("Error response text:", text);
            console.error("Error response status:", response.status);
            console.error("Error response headers:", Object.fromEntries(response.headers.entries()));
            
            if (text && text.trim()) {
              try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.error || errorData.details || errorMessage;
                console.error("Failed to send message (parsed):", errorData);
              } catch (jsonError) {
                // If not JSON, use the text as error message
                errorMessage = text.substring(0, 200) || errorMessage;
                console.error("Failed to send message (non-JSON response):", text.substring(0, 200));
              }
            }
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
          }
          alert(errorMessage);
        }
        return; // Early return to avoid duplicate processing
      } else {
        // Send as JSON for text-only messages
        response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            content: messageContent.trim(),
          }),
        });
      }

      if (response.ok) {
        const message = await response.json();
        if (isReply && parentId) {
          // Update parent message with new reply
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === parentId
                ? { ...msg, replies: [...(msg.replies || []), message] }
                : msg
            )
          );
        } else {
          setMessages((prev) => [...prev, message]);
        }
        setNewMessage("");
        setEditingContent("");
        setSelectedImage(null);
        setImagePreview(null);
        setSelectedFiles([]);
        setReplyingToMessageId(null);
        setEditingMessageId(null);
        // Scroll to bottom immediately after sending message
        setTimeout(() => scrollToBottom(true), 50);
        // Update channel message count
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === selectedChannel.id
              ? { 
                  ...ch, 
                  _count: { 
                    messages: (ch._count?.messages || 0) + 1 
                  } 
                }
              : ch
          )
        );
      } else {
        // Handle error response
        let errorMessage = "Unable to send message. Please try again.";
        try {
          const text = await response.text();
          console.error("Error response text:", text);
          console.error("Error response status:", response.status);
          
          if (text && text.trim()) {
            try {
              const errorData = JSON.parse(text);
              // Use user-friendly error message
              if (errorData.error === "Invalid input") {
                errorMessage = "Please check your message and try again.";
              } else if (errorData.error === "Unauthorized") {
                errorMessage = "You are not authorized to send messages in this channel.";
              } else if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (jsonError) {
              // If not JSON, use generic message
              console.error("Failed to parse error response:", jsonError);
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      alert("Unable to send message. Please check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedChannel) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery)}&channelId=${selectedChannel.id}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Error searching messages:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      });
      if (response.ok) {
        const updated = await response.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updated : msg))
        );
        setEditingMessageId(null);
        setEditingContent("");
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
      if (response.ok) {
        const updated = await response.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updated : msg))
        );
        if (isPinned) {
          fetchPinnedMessages();
        }
      }
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  };

  const fetchPinnedMessages = async () => {
    if (!selectedChannel) return;
    try {
      const response = await fetch(`/api/messages/pinned?channelId=${selectedChannel.id}`);
      if (response.ok) {
        const pinned = await response.json();
        setPinnedMessages(pinned);
      }
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAttachment = async (messageId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);

      const response = await fetch(`/api/messages/${messageId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const attachment = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, attachments: [...(msg.attachments || []), attachment] }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    }
  };

  const handleDeleteAttachment = async (messageId: string, attachmentId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  attachments: msg.attachments?.filter((att) => att.id !== attachmentId),
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
    }
  };

  const hasChannelAccess = (channel: Channel): boolean => {
    // General channels - everyone can access
    if (channel.isGeneral) return true;
    
    // Private channels - only members can access
    if (!session?.user) return false;
    return channel.members.some((member) => member.id === session.user.id);
  };

  const handleChannelSelect = (channel: Channel) => {
    // Check access before selecting
    if (!hasChannelAccess(channel)) {
      alert("You don't have access to this channel");
      return;
    }
    setSelectedChannel(channel);
    setMessages([]);
    // Mark as read when selected
    const now = new Date().toISOString();
    setLastReadTimes((prev) => ({
      ...prev,
      [channel.id]: now,
    }));
    setUnreadCounts((prev) => ({
      ...prev,
      [channel.id]: 0,
    }));
  };

  const handleChannelCreated = async (channel: Channel) => {
    // Reload channels from API to ensure we only see channels we have access to
    try {
      const response = await fetch("/api/channels");
      if (response.ok) {
        const updatedChannels = await response.json();
        setChannels(updatedChannels);
        
        // Select the newly created channel if user has access
        const newChannel = updatedChannels.find((ch: Channel) => ch.id === channel.id);
        if (newChannel && hasChannelAccess(newChannel)) {
          setSelectedChannel(newChannel);
        } else if (updatedChannels.length > 0) {
          // If can't access new channel, select first available
          setSelectedChannel(updatedChannels[0]);
        }
      }
    } catch (error) {
      console.error("Error reloading channels:", error);
      // Fallback: only add if user has access
      if (hasChannelAccess(channel)) {
        setChannels((prev) => [...prev, channel]);
        setSelectedChannel(channel);
      }
    }
  };

  const handleChannelUpdated = async (channel: Channel) => {
    // Reload channels from API to ensure we only see channels we have access to
    try {
      const response = await fetch("/api/channels");
      if (response.ok) {
        const updatedChannels = await response.json();
        setChannels(updatedChannels);
        
        // Check if updated channel is still accessible
        const updatedChannel = updatedChannels.find((ch: Channel) => ch.id === channel.id);
        if (updatedChannel && hasChannelAccess(updatedChannel)) {
          setSelectedChannel(updatedChannel);
        } else if (selectedChannel?.id === channel.id) {
          // If current channel is no longer accessible, select first available
          if (updatedChannels.length > 0) {
            setSelectedChannel(updatedChannels[0]);
          } else {
            setSelectedChannel(null);
          }
        }
      }
    } catch (error) {
      console.error("Error reloading channels:", error);
      // Fallback: update in place
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channel.id ? channel : ch))
      );
      if (selectedChannel?.id === channel.id && hasChannelAccess(channel)) {
        setSelectedChannel(channel);
      }
    }
  };

  const handleChannelDeleted = (channelId: string) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(channels.find((ch) => ch.id !== channelId) || null);
    }
  };

  if (!selectedChannel) {
    return (
      <div className="flex h-full border rounded-lg overflow-hidden bg-background">
        {/* Channel List - Left Sidebar (Desktop) */}
        <div className="hidden md:flex w-80 border-r flex-col bg-muted/30">
          <ChannelList
            channels={channels}
            selectedChannelId=""
            onSelectChannel={handleChannelSelect}
            onChannelCreated={handleChannelCreated}
            onChannelUpdated={handleChannelUpdated}
            onChannelDeleted={handleChannelDeleted}
            allUsers={allUsers}
            canManage={canManage}
            unreadCounts={unreadCounts}
          />
        </div>

        {/* Mobile Channel Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[300px] p-0">
            <ChannelList
              channels={channels}
              selectedChannelId=""
              onSelectChannel={(channel) => {
                handleChannelSelect(channel);
                setMobileMenuOpen(false);
              }}
              onChannelCreated={handleChannelCreated}
              onChannelUpdated={handleChannelUpdated}
              onChannelDeleted={handleChannelDeleted}
              allUsers={allUsers}
              canManage={canManage}
              unreadCounts={unreadCounts}
            />
          </SheetContent>
        </Sheet>

        {/* Empty State - Right Side */}
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="text-center text-muted-foreground p-4">
            {canManage ? (
              <div className="space-y-4">
                <p className="md:hidden">Tap the menu button to select a channel or create a new one.</p>
                <p className="hidden md:block">No channel selected. Select a channel or create a new one.</p>
              </div>
            ) : (
              <p>No channel selected. Select a channel to start messaging.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-background">
      {/* Channel List - Left Sidebar (Desktop) */}
      <div className="hidden md:flex w-80 border-r flex-col bg-muted/30">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannel.id}
          onSelectChannel={handleChannelSelect}
          onChannelCreated={handleChannelCreated}
          onChannelUpdated={handleChannelUpdated}
          onChannelDeleted={handleChannelDeleted}
          allUsers={allUsers}
          canManage={canManage}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Mobile Channel Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannel.id}
            onSelectChannel={(channel) => {
              handleChannelSelect(channel);
              setMobileMenuOpen(false);
            }}
            onChannelCreated={handleChannelCreated}
            onChannelUpdated={handleChannelUpdated}
            onChannelDeleted={handleChannelDeleted}
            allUsers={allUsers}
            canManage={canManage}
            unreadCounts={unreadCounts}
          />
        </SheetContent>
      </Sheet>

      {/* Messages - Right Side */}
        <div className="flex-1 flex flex-col bg-background w-full md:w-auto min-h-0">
        {/* Messages Area - Scrollable, grows to fill space */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 min-h-0 bg-background/40 dark:bg-background/50 backdrop-blur-sm"
        >
          {isLoading && messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Loading messages...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Search results ({searchResults.length})
              </div>
              {searchResults.map((message) => (
                <div key={message.id} className="border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.user.name || message.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    {message.channel && (
                      <Badge variant="outline" className="text-xs">
                        {message.channel.name}
                      </Badge>
                    )}
                  </div>
                  {message.content && (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                if (message.deletedAt) return null;
                const isOwnMessage = message.user.id === currentUser.id;
                const isEditing = editingMessageId === message.id;
                const isReplying = replyingToMessageId === message.id;
                const hasReplies = message.replies && message.replies.length > 0;
                const showReplies = expandedReplies.has(message.id);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 relative ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      } ${message.isPinned ? "ring-2 ring-yellow-400" : ""}`}
                      onTouchStart={(e) => {
                        // Mobile long press
                        longPressTimerRef.current = setTimeout(() => {
                          setLongPressMessageId(message.id);
                          // Prevent default to avoid text selection
                          e.preventDefault();
                        }, 500); // 500ms long press
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onTouchMove={() => {
                        // Cancel long press if user moves finger
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                    >
                      {/* Dropdown Menu - Top Right (Desktop - hover only) */}
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setReplyingToMessageId(message.id);
                                setEditingContent("");
                              }}
                            >
                              <Reply className="h-4 w-4 mr-2" />
                              Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setForwardingMessageId(message.id);
                              }}
                            >
                              <Forward className="h-4 w-4 mr-2" />
                              Forward
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePinMessage(message.id, !message.isPinned)}
                            >
                              <Pin className={`h-4 w-4 mr-2 ${message.isPinned ? "fill-current" : ""}`} />
                              {message.isPinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Star functionality - to be implemented
                                console.log("Star message:", message.id);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Star
                            </DropdownMenuItem>
                            {isOwnMessage && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteMessage(message.id)}
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Mobile Dropdown Menu (long press) */}
                      <div className="md:hidden">
                        <DropdownMenu open={longPressMessageId === message.id} onOpenChange={(open) => {
                          if (!open) setLongPressMessageId(null);
                        }}>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setReplyingToMessageId(message.id);
                                setEditingContent("");
                                setLongPressMessageId(null);
                              }}
                            >
                              <Reply className="h-4 w-4 mr-2" />
                              Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setForwardingMessageId(message.id);
                                setLongPressMessageId(null);
                              }}
                            >
                              <Forward className="h-4 w-4 mr-2" />
                              Forward
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                handlePinMessage(message.id, !message.isPinned);
                                setLongPressMessageId(null);
                              }}
                            >
                              <Pin className={`h-4 w-4 mr-2 ${message.isPinned ? "fill-current" : ""}`} />
                              {message.isPinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Star functionality - to be implemented
                                console.log("Star message:", message.id);
                                setLongPressMessageId(null);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Star
                            </DropdownMenuItem>
                            {isOwnMessage && (
                              <DropdownMenuItem
                                onClick={() => {
                                  handleDeleteMessage(message.id);
                                  setLongPressMessageId(null);
                                }}
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {message.isPinned && (
                        <div className="absolute -top-2 -right-2">
                          <Pin className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                      {message.parentMessage && (
                        <div className="mb-2 text-xs opacity-70 border-l-2 pl-2">
                          Replying to: {message.parentMessage.user.name || message.parentMessage.user.email}
                          {message.parentMessage.content && (
                            <span className="ml-1">- {message.parentMessage.content.substring(0, 50)}...</span>
                          )}
                        </div>
                      )}
                      {!isOwnMessage && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.user.name || message.user.email}
                        </p>
                      )}
                      {message.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={message.imageUrl}
                            alt="Message attachment"
                            className="max-w-full h-auto rounded-lg max-h-96 object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {message.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-2 p-2 bg-background/50 rounded text-xs cursor-pointer hover:bg-background/70 transition-colors"
                              onClick={() => {
                                // Open PDF in new tab
                                if (att.mimeType?.includes("pdf") || att.fileName.endsWith(".pdf")) {
                                  window.open(att.fileUrl, "_blank");
                                } else {
                                  // Download other files
                                  const link = document.createElement("a");
                                  link.href = att.fileUrl;
                                  link.download = att.fileName;
                                  link.click();
                                }
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              <span className="flex-1 truncate">{att.fileName}</span>
                              <Download className="h-4 w-4" />
                              {isOwnMessage && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAttachment(message.id, att.id);
                                  }}
                                  className="text-destructive hover:underline"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditMessage(message.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        message.content && (
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                            {message.editedAt && (
                              <span className="text-xs opacity-50 ml-1">(edited)</span>
                            )}
                          </p>
                        )
                      )}
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                        {isOwnMessage && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (message.reads && message.reads.length > 0) {
                                  setShowReadBy(showReadBy === message.id ? null : message.id);
                                }
                              }}
                              className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              {message.reads && message.reads.length > 0 ? (
                                <>
                                  <CheckCheck className="h-3 w-3" />
                                  <span>Read</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Sent</span>
                                </>
                              )}
                            </button>
                            {/* Read by list */}
                            {showReadBy === message.id && message.reads && message.reads.length > 0 && (
                              <div className="absolute bottom-full right-0 mb-2 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px] z-10">
                                <div className="text-xs font-semibold mb-1">Read by:</div>
                                <div className="space-y-1">
                                  {message.reads.map((read) => (
                                    <div key={read.userId} className="text-xs flex items-center gap-2">
                                      <span>{read.user.name || read.user.email}</span>
                                      <span className="text-muted-foreground">
                                        {formatDistanceToNow(new Date(read.readAt), { addSuffix: true })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Replies */}
                      {hasReplies && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedReplies);
                              if (showReplies) {
                                newExpanded.delete(message.id);
                              } else {
                                newExpanded.add(message.id);
                              }
                              setExpandedReplies(newExpanded);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {showReplies ? "Hide" : "Show"} {message.replies?.length} {message.replies?.length === 1 ? "reply" : "replies"}
                          </button>
                          {showReplies && message.replies && (
                            <div className="mt-2 ml-4 space-y-2 border-l-2 pl-2">
                              {message.replies.map((reply) => (
                                <div key={reply.id} className="text-sm">
                                  <span className="font-medium text-xs">
                                    {reply.user.name || reply.user.email}:
                                  </span>{" "}
                                  {reply.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t p-4 bg-muted/30 flex-shrink-0">
          {replyingToMessageId && (
            <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Replying to message...
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingToMessageId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-48 rounded-lg object-contain border"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {selectedFiles.length > 0 && (
            <div className="mb-2 space-y-1">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-background rounded text-xs"
                >
                  <FileText className="h-4 w-4" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-destructive hover:underline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (replyingToMessageId) {
                handleSendMessage(true, replyingToMessageId);
              } else {
                handleSendMessage();
              }
            }}
            className="flex gap-2"
          >
            <div className="flex-1 flex gap-2">
              <Input
                value={replyingToMessageId ? editingContent : newMessage}
                onChange={(e) => {
                  if (replyingToMessageId) {
                    setEditingContent(e.target.value);
                  } else {
                    setNewMessage(e.target.value);
                  }
                }}
                placeholder={replyingToMessageId ? "Type a reply... (use @username to mention)" : "Type a message... (use @username to mention)"}
                disabled={isSending}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const hasContent = replyingToMessageId
                      ? editingContent.trim()
                      : newMessage.trim();
                    if (hasContent || selectedImage || selectedFiles.length > 0) {
                      if (replyingToMessageId) {
                        handleSendMessage(true, replyingToMessageId);
                      } else {
                        handleSendMessage();
                      }
                    }
                  }
                }}
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isSending}
                  id="image-input"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  disabled={isSending}
                  onClick={() => {
                    const input = document.getElementById("image-input") as HTMLInputElement;
                    if (input) {
                      input.click();
                    }
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isSending}
                  multiple
                  id="file-input"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  disabled={isSending}
                  onClick={() => {
                    const input = document.getElementById("file-input") as HTMLInputElement;
                    if (input) {
                      input.click();
                    }
                  }}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </label>
            </div>
            <Button 
              type="submit" 
              disabled={
                isSending ||
                ((replyingToMessageId ? !editingContent.trim() : !newMessage.trim()) &&
                  !selectedImage &&
                  selectedFiles.length === 0)
              }
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

