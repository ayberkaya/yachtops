import "server-only";
import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { createNotification } from "./notifications";

/**
 * Parse @mentions from message content
 * Returns array of mentioned usernames/emails
 */
export function parseMentions(content: string | null): string[] {
  if (!content) return [];
  
  // Match @username or @email patterns (more flexible)
  const mentionRegex = /@([\w.@-]+)/g;
  const matches = Array.from(content.matchAll(mentionRegex));
  if (!matches || matches.length === 0) return [];
  
  // Extract usernames/emails (remove @)
  const mentions = matches.map(match => match[1].trim());
  
  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Find users by username or email
 */
export async function findUsersByMention(
  mentions: string[],
  yachtId: string | null
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  if (mentions.length === 0) return [];
  
  const users = await db.user.findMany({
    where: {
      yachtId: yachtId || undefined,
      OR: [
        { email: { in: mentions } },
        { name: { in: mentions } },
        // Also check if email starts with mention (for partial matches)
        ...mentions.map(mention => ({
          email: { startsWith: mention },
        })),
        ...mentions.map(mention => ({
          name: { contains: mention },
        })),
      ],
    },
    select: { id: true, name: true, email: true },
  });
  
  return users;
}

/**
 * Notify mentioned users
 */
export async function notifyMentions(
  messageId: string,
  channelId: string,
  content: string | null,
  senderName: string,
  yachtId: string | null
) {
  try {
    const mentions = parseMentions(content);
    if (mentions.length === 0) return;
    
    const mentionedUsers = await findUsersByMention(mentions, yachtId);
    if (mentionedUsers.length === 0) return;
    
    // Get channel name
    const channel = await db.messageChannel.findUnique({
      where: { id: channelId },
      select: { name: true },
    });
    
    const channelName = channel?.name || "Unknown channel";
    
    // Create notifications for mentioned users
    await Promise.all(
      mentionedUsers.map(user =>
        createNotification(
          user.id,
          NotificationType.MESSAGE_MENTION,
          `${senderName} mentioned you in #${channelName}`,
          undefined,
          messageId
        )
      )
    );
  } catch (error) {
    console.error("Error notifying mentions:", error);
  }
}

/**
 * Notify channel members of new message (if preferences allow)
 * Sends push notifications to all channel members except the sender and mentioned users
 */
export async function notifyNewMessage(
  messageId: string,
  channelId: string,
  senderId: string,
  senderName: string,
  content: string | null,
  yachtId: string | null
) {
  try {
    // Get channel with members
    const channel = await db.messageChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!channel) return;

    // Get channel name
    const channelName = channel.name || "Unknown channel";

    // Find mentioned users to exclude them from general message notification
    // (they already get a mention notification)
    const mentions = parseMentions(content);
    const mentionedUserIds = new Set<string>();
    if (mentions.length > 0) {
      const mentionedUsers = await findUsersByMention(mentions, yachtId);
      mentionedUsers.forEach(user => mentionedUserIds.add(user.id));
    }

    // Notify all channel members except the sender and mentioned users
    const membersToNotify = channel.members.filter(
      (member: { id: string }) => 
        member.id !== senderId && !mentionedUserIds.has(member.id)
    );

    if (membersToNotify.length === 0) return;

    // Create notifications for all members (push notification will be sent automatically)
    await Promise.all(
      membersToNotify.map((member: { id: string }) =>
        createNotification(
          member.id,
          NotificationType.MESSAGE_RECEIVED,
          `${senderName} sent a message in #${channelName}`,
          undefined,
          messageId
        )
      )
    );
  } catch (error) {
    console.error("Error notifying new message:", error);
  }
}

