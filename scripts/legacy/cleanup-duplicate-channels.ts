/**
 * Script to clean up duplicate message channels
 * Removes duplicate channels, keeping the oldest one for each yacht+name combination
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupDuplicateChannels() {
  console.log("🔍 Searching for duplicate channels...");

  try {
    // Find all channels grouped by yachtId and name
    const allChannels = await prisma.messageChannel.findMany({
      orderBy: [
        { yachtId: "asc" },
        { name: "asc" },
        { createdAt: "asc" }, // Oldest first
      ],
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Group by yachtId + name
    const channelGroups = new Map<string, typeof allChannels>();
    
    for (const channel of allChannels) {
      const key = `${channel.yachtId}:${channel.name}`;
      if (!channelGroups.has(key)) {
        channelGroups.set(key, []);
      }
      channelGroups.get(key)!.push(channel);
    }

    // Find duplicates (groups with more than 1 channel)
    const duplicates: Array<{ key: string; channels: typeof allChannels }> = [];
    for (const [key, channels] of channelGroups.entries()) {
      if (channels.length > 1) {
        duplicates.push({ key, channels });
      }
    }

    if (duplicates.length === 0) {
      console.log("✅ No duplicate channels found!");
      return;
    }

    console.log(`\n📊 Found ${duplicates.length} duplicate channel group(s):\n`);

    let totalDeleted = 0;

    for (const { key, channels } of duplicates) {
      const [yachtId, name] = key.split(":");
      console.log(`  Group: "${name}" (Yacht: ${yachtId})`);
      console.log(`    Found ${channels.length} duplicate(s)`);

      // Keep the oldest channel (first in array due to sorting)
      const keepChannel = channels[0];
      const deleteChannels = channels.slice(1);

      console.log(`    Keeping: ${keepChannel.id} (created: ${keepChannel.createdAt.toISOString()}, messages: ${keepChannel._count.messages})`);

      for (const channel of deleteChannels) {
        console.log(`    Deleting: ${channel.id} (created: ${channel.createdAt.toISOString()}, messages: ${channel._count.messages})`);
        
        // Delete the channel (messages will be cascade deleted)
        await prisma.messageChannel.delete({
          where: { id: channel.id },
        });
        
        totalDeleted++;
      }
      console.log("");
    }

    console.log(`✅ Cleanup complete! Deleted ${totalDeleted} duplicate channel(s).`);
  } catch (error) {
    console.error("❌ Error cleaning up duplicate channels:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateChannels()
  .then(() => {
    console.log("\n🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });

