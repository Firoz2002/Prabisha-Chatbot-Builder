export interface Message {
  id?: string
  content: string
  senderType: "USER" | "BOT"
  createdAt?: Date 
  updatedAt?: Date
}