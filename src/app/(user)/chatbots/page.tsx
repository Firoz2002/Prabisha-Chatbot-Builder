"use client"

import { useState } from "react"
import { Search, Bookmark, RotateCcw, Plus, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Chatbot {
  id: string
  name: string
  icon: string
  conversations: number
  model: string
  location: string
  lastModified: string
  owner: string
  ownerInitials: string
}

const mockChatbots: Chatbot[] = [
  {
    id: "1",
    name: "Test",
    icon: "🔥",
    conversations: 0,
    model: "gpt-4.1-mini",
    location: "-",
    lastModified: "17 hours ago",
    owner: "FK",
    ownerInitials: "FK",
  },
]

export default function ChatbotsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [itemsPerPage, setItemsPerPage] = useState("25")

  const filteredChatbots = mockChatbots.filter((chatbot) =>
    chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalItems = filteredChatbots.length
  const startItem = 1
  const endItem = Math.min(Number.parseInt(itemsPerPage), totalItems)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Chatbots</h1>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All chatbots</SelectItem>
            <SelectItem value="owned">Owned by me</SelectItem>
            <SelectItem value="shared">Shared with me</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon">
          <Bookmark className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Conversations</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last modified</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChatbots.map((chatbot) => (
              <TableRow key={chatbot.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{chatbot.icon}</span>
                    <span className="font-medium">{chatbot.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💬</span>
                    <span>{chatbot.conversations}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{chatbot.model}</TableCell>
                <TableCell className="text-sm">{chatbot.location}</TableCell>
                <TableCell className="text-sm">{chatbot.lastModified}</TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    <span className="h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                      {chatbot.ownerInitials[0]}
                    </span>
                    {chatbot.owner}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {startItem}–{endItem} of {totalItems}
        </span>
        <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
