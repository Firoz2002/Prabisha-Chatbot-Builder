/*
  Warnings:

  - Made the column `model` on table `chatbot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `temperature` on table `chatbot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `max_tokens` on table `chatbot` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `chatbot` MODIFY `model` VARCHAR(191) NOT NULL DEFAULT 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    MODIFY `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    MODIFY `max_tokens` INTEGER NOT NULL DEFAULT 500;
