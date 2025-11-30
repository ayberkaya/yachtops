-- CreateTable
CREATE TABLE "message_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yacht_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_general" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by_user_id" TEXT,
    CONSTRAINT "message_channels_yacht_id_fkey" FOREIGN KEY ("yacht_id") REFERENCES "yachts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_channels_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "message_channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChannelMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChannelMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "message_channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChannelMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ChannelMembers_AB_unique" ON "_ChannelMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_ChannelMembers_B_index" ON "_ChannelMembers"("B");
