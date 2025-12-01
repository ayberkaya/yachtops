"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Send, Hash, Users, Menu } from "lucide-react";
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
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const canManage = canManageUsers(session?.user || null);

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
        setMessages(data);
        
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || isSending) return;

    // Check access before sending
    if (!hasChannelAccess(selectedChannel)) {
      alert("You don't have access to this channel");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage("");
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
        const result = await response.json();
        alert(result.error || "Failed to send message");
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
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t p-4 bg-muted/30 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

