"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Send, Hash, Users, Menu, Image as ImageIcon, X } from "lucide-react";
import { ChannelList } from "./channel-list";
import { ChannelForm } from "./channel-form";
import { canManageUsers } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface Message {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
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
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
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
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChannel, channels]);

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

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedChannel || isSending) return;

    // Check access before sending
    if (!hasChannelAccess(selectedChannel)) {
      alert("You don't have access to this channel");
      return;
    }

    setIsSending(true);
    try {
      let response: Response;

      if (selectedImage) {
        // Send with FormData for image
        const formData = new FormData();
        formData.append("channelId", selectedChannel.id);
        if (newMessage.trim()) {
          formData.append("content", newMessage.trim());
        }
        formData.append("image", selectedImage);

        response = await fetch("/api/messages", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send as JSON for text-only messages
        response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            content: newMessage.trim(),
          }),
        });
      }

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage("");
        setSelectedImage(null);
        setImagePreview(null);
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
        const result = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to send message:", result);
        alert(result.error || result.details || "Failed to send message");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSending(false);
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
        {/* Header - Fixed */}
        <div className="border-b p-4 bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile: Show channel list button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            {selectedChannel.isGeneral ? (
              <Hash className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
            <div className="flex-1">
              <h2 className="font-semibold">{selectedChannel.name}</h2>
              {selectedChannel.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedChannel.description}
                </p>
              )}
            </div>
            {selectedChannel.isGeneral && (
              <Badge variant="secondary">General</Badge>
            )}
          </div>
        </div>

        {/* Messages Area - Scrollable, grows to fill space */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 min-h-0"
        >
          {isLoading && messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.user.id === currentUser.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
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
                          />
                        </div>
                      )}
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                        {isOwnMessage && (
                          <div className="flex items-center gap-1 text-xs opacity-70">
                            {message.reads && message.reads.length > 0 ? (
                              <>
                                <span>✓✓</span>
                                <span>Read</span>
                              </>
                            ) : (
                              <>
                                <span>✓</span>
                                <span>Sent</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <div className="flex-1 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim() || selectedImage) {
                      handleSendMessage();
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
            </div>
            <Button 
              type="submit" 
              disabled={isSending || (!newMessage.trim() && !selectedImage)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

