"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hash, Users, Plus, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChannelForm } from "./channel-form";
import { ChannelEditForm } from "./channel-edit-form";

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
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

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  onChannelCreated: (channel: Channel) => void;
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
  allUsers: User[];
  canManage: boolean;
  unreadCounts?: Record<string, number>;
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelCreated,
  onChannelUpdated,
  onChannelDeleted,
  allUsers,
  canManage,
  unreadCounts = {},
}: ChannelListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const handleEdit = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-background/95 dark:bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Channels</h3>
          {canManage && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                  <DialogDescription>
                    Create a new private channel and assign members
                  </DialogDescription>
                </DialogHeader>
                <ChannelForm
                  allUsers={allUsers}
                  onSuccess={(channel) => {
                    onChannelCreated(channel);
                    setIsCreateDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30 bg-background/95 dark:bg-background/40 backdrop-blur-sm">
          {channels.map((channel) => {
            const unreadCount = unreadCounts[channel.id] || 0;
            return (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`p-3 cursor-pointer hover:bg-background/80 dark:hover:bg-background/60 transition-all duration-200 relative backdrop-blur-sm ${
                  selectedChannelId === channel.id ? "bg-background/95 dark:bg-background/70 backdrop-blur-md" : "bg-background/90 dark:bg-background/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {channel.isGeneral ? (
                        <Hash className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <Users className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.isGeneral && (
                          <Badge variant="secondary" className="text-xs">
                            General
                          </Badge>
                        )}
                      </div>
                      {channel.description ? (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {channel.description}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {channel._count?.messages || 0} message{(channel._count?.messages || 0) !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {unreadCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                    {canManage && !channel.isGeneral && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleEdit(channel, e)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {canManage && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Channel</DialogTitle>
              <DialogDescription>
                Update channel details and members
              </DialogDescription>
            </DialogHeader>
            {editingChannel && (
              <ChannelEditForm
                channel={editingChannel}
                allUsers={allUsers}
                onSuccess={(channel) => {
                  onChannelUpdated(channel);
                  setIsEditDialogOpen(false);
                  setEditingChannel(null);
                }}
                onDelete={(channelId) => {
                  onChannelDeleted(channelId);
                  setIsEditDialogOpen(false);
                  setEditingChannel(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

