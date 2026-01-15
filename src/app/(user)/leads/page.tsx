'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
interface LeadData {
  [key: string]: string | number | boolean;
}

interface Lead {
  id: string;
  data: LeadData;
  createdAt: string;
  chatbot: {
    name: string;
  };
  form: {
    formTitle: string;
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
  
  // TODO: Replace with actual session hook (e.g. useSession from next-auth)
  const userId = "user_123456789"; 

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leads&page=${page}&limit=10`);
        const data = await res.json();
        
        if (data.leads) {
          setLeads(data.leads);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Failed to load leads", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchLeads();
    }
  }, [page, userId]);

  // Helper to intelligently extract a name or email to display as the main identifier
  const getPrimaryContact = (data: LeadData) => {
    const keys = Object.keys(data).map(k => k.toLowerCase());
    
    // Priority list for display
    const emailKey = keys.find(k => k.includes('email'));
    const nameKey = keys.find(k => k.includes('name'));
    const phoneKey = keys.find(k => k.includes('phone'));

    const originalKey = (searchKey: string | undefined) => 
      searchKey ? Object.keys(data).find(k => k.toLowerCase() === searchKey) : null;

    if (emailKey) return data[originalKey(emailKey)!];
    if (nameKey) return data[originalKey(nameKey)!];
    if (phoneKey) return data[originalKey(phoneKey)!];
    
    return "Anonymous Lead";
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Manage and view leads captured across all your chatbots.
          </p>
        </div>
        {pagination && (
          <div className="text-sm font-medium text-muted-foreground">
            Total Leads: {pagination.total}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            A list of recent leads from all active workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Contact Info</TableHead>
                  <TableHead>Source (Chatbot)</TableHead>
                  <TableHead className="hidden md:table-cell">Submission Data</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading State Skeletons
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  // Empty State
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data Rows
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={String(getPrimaryContact(lead.data))}>
                            {getPrimaryContact(lead.data)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lead.form?.formTitle || 'Standard Form'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {lead.chatbot.name}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(lead.data).slice(0, 4).map(([key, value]) => (
                            <div 
                              key={key} 
                              className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                              <span className="opacity-70 mr-1">{key}:</span> 
                              <span className="truncate max-w-[150px]">{String(value)}</span>
                            </div>
                          ))}
                          {Object.keys(lead.data).length > 4 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{Object.keys(lead.data).length - 4} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right text-muted-foreground">
                        <span className="whitespace-nowrap">
                          {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                        </span>
                        <div className="text-xs">
                          {format(new Date(lead.createdAt), 'h:mm a')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground mx-2">
                Page {page} of {pagination.totalPages}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}