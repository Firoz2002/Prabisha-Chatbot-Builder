/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `chatbot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `chatbot` DROP FOREIGN KEY `Chatbot_workspaceId_fkey`;

-- DropIndex
DROP INDEX `Chatbot_workspaceId_fkey` ON `chatbot`;

-- AlterTable
ALTER TABLE `chatbot` DROP COLUMN `workspaceId`;
