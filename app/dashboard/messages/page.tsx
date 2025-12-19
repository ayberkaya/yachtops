import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MessagesView } from "@/components/messages/messages-view";
import { hasPermission } from "@/lib/permissions";

export default async function MessagesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "messages.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Get all accessible channels
  const allChannels = await db.messageChannel.findMany({
    where: {
      yachtId: session.user.yachtId || undefined,
    },
    include: {
      members: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Ensure General channel exists (create if missing, only for OWNER/CAPTAIN)
  const hasGeneralChannel = allChannels.some((ch) => ch.isGeneral);
  if (!hasGeneralChannel && (session.user.role === "OWNER" || session.user.role === "CAPTAIN")) {
    try {
      const generalChannel = await db.messageChannel.create({
        data: {
          yachtId: session.user.yachtId || undefined,
          name: "General",
          description: "General discussion channel for all crew members",
          isGeneral: true,
          createdByUserId: session.user.id,
        },
        include: {
          members: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      });
      // Add General channel to the list
      allChannels.push(generalChannel);
    } catch (error) {
      // If General channel already exists (race condition), ignore error
      // It will be included in the next page load
      console.error("Error ensuring General channel exists:", error);
    }
  }

  // Filter channels based on user access and sort: general first, then alphabetically
  const accessibleChannels = allChannels
    .filter((channel: { isGeneral: boolean; members: { id: string }[] }) => {
      if (channel.isGeneral) return true;
      return channel.members.some((member: { id: string }) => member.id === session.user.id);
    })
    .sort((a: { isGeneral: boolean; name: string }, b: { isGeneral: boolean; name: string }) => {
      // General channels always first
      if (a.isGeneral && !b.isGeneral) return -1;
      if (!a.isGeneral && b.isGeneral) return 1;
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });

  // Get all users for channel management (only for OWNER/CAPTAIN)
  const allUsers = session.user.role === "OWNER" || session.user.role === "CAPTAIN"
    ? await db.user.findMany({
        where: {
          yachtId: session.user.yachtId || undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)]">
      <MessagesView
        initialChannels={accessibleChannels}
        allUsers={allUsers}
        currentUser={session.user}
      />
    </div>
  );
}

