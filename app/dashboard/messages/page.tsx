import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { MessagesView } from "@/components/messages/messages-view";

export default async function MessagesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
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

  // Filter channels based on user access and sort: general first, then by creation date
  const accessibleChannels = allChannels
    .filter((channel) => {
      if (channel.isGeneral) return true;
      return channel.members.some((member) => member.id === session.user.id);
    })
    .sort((a, b) => {
      // General channels first
      if (a.isGeneral && !b.isGeneral) return -1;
      if (!a.isGeneral && b.isGeneral) return 1;
      // Then by creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
    <div className="h-[calc(100vh-8rem)]">
      <MessagesView
        initialChannels={accessibleChannels}
        allUsers={allUsers}
        currentUser={session.user}
      />
    </div>
  );
}

