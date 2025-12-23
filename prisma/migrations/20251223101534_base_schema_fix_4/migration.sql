-- AlterTable
ALTER TABLE `chatbot` MODIFY `model` VARCHAR(191) NULL DEFAULT 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    MODIFY `temperature` DOUBLE NULL DEFAULT 0.7,
    MODIFY `max_tokens` INTEGER NULL DEFAULT 500;
