'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical,
  User,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Globe,
  Building
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Types ---
interface LeadData {
  [key: string]: string | number | boolean;
}

interface Lead {
  id: string;
  data: LeadData;
  createdAt: string;
  updatedAt: string;
  chatbot: {
    id: string;
    name: string;
    workspace: {
      id: string;
      name: string;
    };
  };
  form: {
    id: string;
    title: string;
    description?: string;
    leadTiming: string;
    leadFormStyle: string;
  };
  conversation?: {
    id: string;
    title?: string;
    createdAt: string;
    messages?: Array<{
      content: string;
    }>;
  };
  conversationPreview?: string;
  workspace?: {
    id: string;
    name: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [chatbots, setChatbots] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          ...(search && { search }),
          ...(selectedWorkspace !== 'all' && { workspaceId: selectedWorkspace }),
          ...(selectedChatbot !== 'all' && { chatbotId: selectedChatbot }),
        });

        const res = await fetch(`/api/leads?${params.toString()}`);
        const data = await res.json();
        
        if (data.leads) {
          setLeads(data.leads);
          setPagination(data.pagination);
          
          // Extract unique workspaces and chatbots
          const uniqueWorkspaces: string[] = Array.from(
            new Set(data.leads.map((lead: Lead) => lead.chatbot.workspace.name))
          );
          const uniqueChatbots: string[] = Array.from(
            new Set(data.leads.map((lead: Lead) => lead.chatbot.name))
          );
          setWorkspaces(uniqueWorkspaces);
          setChatbots(uniqueChatbots);
        }
      } catch (error) {
        console.error("Failed to load leads", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [page, search, selectedWorkspace, selectedChatbot, timeFilter]);

  // Helper to extract contact information
  const extractContactInfo = (data: LeadData) => {
    const keys = Object.keys(data).map(k => k.toLowerCase());
    
    const emailKey = keys.find(k => k.includes('email'));
    const nameKey = keys.find(k => k.includes('name') && !k.includes('last') && !k.includes('first'));
    const firstNameKey = keys.find(k => k.includes('first'));
    const lastNameKey = keys.find(k => k.includes('last'));
    const phoneKey = keys.find(k => k.includes('phone') || k.includes('mobile'));
    const companyKey = keys.find(k => k.includes('company') || k.includes('organization'));

    const getOriginalKey = (searchKey: string | undefined) => 
      searchKey ? Object.keys(data).find(k => k.toLowerCase() === searchKey) : null;

    return {
      email: emailKey ? data[getOriginalKey(emailKey)!] as string : null,
      name: nameKey ? data[getOriginalKey(nameKey)!] as string : 
            (firstNameKey && lastNameKey) ? 
              `${data[getOriginalKey(firstNameKey)!]} ${data[getOriginalKey(lastNameKey)!]}` :
            firstNameKey ? data[getOriginalKey(firstNameKey)!] as string :
            lastNameKey ? data[getOriginalKey(lastNameKey)!] as string :
            null,
      phone: phoneKey ? data[getOriginalKey(phoneKey)!] as string : null,
      company: companyKey ? data[getOriginalKey(companyKey)!] as string : null,
    };
  };

  // Filter leads by time
  const filterLeadsByTime = (leads: Lead[]) => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return leads.filter(lead => {
          const leadDate = new Date(lead.createdAt);
          return leadDate.toDateString() === now.toDateString();
        });
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return leads.filter(lead => new Date(lead.createdAt) > weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return leads.filter(lead => new Date(lead.createdAt) > monthAgo);
      default:
        return leads;
    }
  };

  const filteredLeads = filterLeadsByTime(leads);

  const handleExportLeads = () => {
    const csvData = [
      ['Name', 'Email', 'Phone', 'Company', 'Chatbot', 'Workspace', 'Form', 'Date', 'Conversation Preview'],
      ...filteredLeads.map(lead => {
        const contact = extractContactInfo(lead.data);
        return [
          contact.name || 'N/A',
          contact.email || 'N/A',
          contact.phone || 'N/A',
          contact.company || 'N/A',
          lead.chatbot.name,
          lead.chatbot.workspace.name,
          lead.form.title,
          format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a'),
          lead.conversationPreview || 'N/A'
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const LeadDetailsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Lead Details</h3>
              <p className="text-muted-foreground">
                Submitted {format(new Date(selectedLead!.createdAt), 'PPpp')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowLeadDetails(false)}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(extractContactInfo(selectedLead!.data)).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex items-center gap-3">
                      <div className="bg-secondary p-2 rounded-full">
                        {key === 'email' ? <Mail className="h-4 w-4" /> :
                         key === 'name' ? <User className="h-4 w-4" /> :
                         key === 'phone' ? <Phone className="h-4 w-4" /> :
                         <Building className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{key}</p>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    </div>
                  )
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Source Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Workspace</p>
                    <p className="text-sm text-muted-foreground">{selectedLead!.chatbot.workspace.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Chatbot</p>
                    <p className="text-sm text-muted-foreground">{selectedLead!.chatbot.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Form</p>
                    <p className="text-sm text-muted-foreground">{selectedLead!.form.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Form Style</p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedLead!.form.leadFormStyle}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Trigger Timing</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedLead!.form.leadTiming}
                  </Badge>
                </div>
                {selectedLead!.conversationPreview && (
                  <div>
                    <p className="text-sm font-medium">First Message</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {selectedLead!.conversationPreview}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Submitted Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(selectedLead!.data).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Track and manage all leads captured across your chatbots and workspaces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportLeads}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Leads</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="qualified">Qualified</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Workspaces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    {workspaces.map(workspace => (
                      <SelectItem key={workspace} value={workspace}>{workspace}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Chatbots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chatbots</SelectItem>
                    {chatbots.map(chatbot => (
                      <SelectItem key={chatbot} value={chatbot}>{chatbot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold">{pagination?.total || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Workspaces</p>
                  <p className="text-3xl font-bold">{workspaces.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Chatbots</p>
                  <p className="text-3xl font-bold">{chatbots.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Avg. Conversion</p>
                  <p className="text-3xl font-bold">
                    {pagination?.total ? Math.round((filteredLeads.length / pagination.total) * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Leads</CardTitle>
                  <CardDescription>
                    Showing {filteredLeads.length} of {pagination?.total || 0} leads
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  Page {page} of {pagination?.totalPages || 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="hidden md:table-cell">Submission Details</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-32" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <User className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">No leads found</p>
                            {search && (
                              <Button variant="ghost" onClick={() => setSearch('')}>
                                Clear search
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => {
                        const contact = extractContactInfo(lead.data);
                        return (
                          <TableRow key={lead.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {contact.name || 'Anonymous'}
                                  </span>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {contact.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {contact.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit">
                                  {lead.chatbot.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {lead.chatbot.workspace.name}
                                </span>
                              </div>
                            </TableCell>
                            
                            <TableCell className="hidden md:table-cell">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{lead.form.title}</p>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {lead.form.leadFormStyle}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {lead.form.leadTiming}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">
                                <div>{format(new Date(lead.createdAt), 'MMM d, yyyy')}</div>
                                <div className="text-muted-foreground">
                                  {format(new Date(lead.createdAt), 'h:mm a')}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedLead(lead);
                                    setShowLeadDetails(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {contact.email && (
                                    <DropdownMenuItem onClick={() => window.location.href = `mailto:${contact.email}`}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Email
                                    </DropdownMenuItem>
                                  )}
                                  {contact.phone && (
                                    <DropdownMenuItem onClick={() => window.location.href = `tel:${contact.phone}`}>
                                      <Phone className="h-4 w-4 mr-2" />
                                      Call
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    Delete Lead
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} leads
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showLeadDetails && selectedLead && <LeadDetailsModal />}
    </div>
  );
}