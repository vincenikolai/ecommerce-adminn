'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { SalesInvoice } from '@/types/sales-invoice';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, RefreshCw } from 'lucide-react';

const SALES_MANAGER_ROLE: UserRole = "sales_manager";

export default function SalesInvoicesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  
  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'invoiceNumber' | 'customerName' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Note: Invoices are automatically created when orders are marked as "Completed"

  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Error fetching session: " + sessionError.message);
        setIsLoading(false);
        return;
      }
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Error fetching user role: " + profileError.message);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
      setIsLoading(false);
    };

    getSessionAndRole();
  }, [supabase.auth]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      
      const response = await fetch(`/api/admin/sales-invoices/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch invoices");
      }
      const data: SalesInvoice[] = await response.json();
      setInvoices(data);
    } catch (error: unknown) {
      console.error("Error in fetchInvoices:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SALES_MANAGER_ROLE) {
      fetchInvoices();
    }
  }, [session, userRole, statusFilter, sortBy, sortOrder]);


  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      case 'PartiallyPaid':
        return 'bg-yellow-100 text-yellow-800';
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Overdue':
        return 'bg-orange-100 text-orange-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-6">Loading invoice data...</div>;
  }

  if (!session || userRole !== SALES_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Sales Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">
            Invoices are automatically created when orders are marked as "Completed"
          </p>
        </div>
        <Button variant="outline" onClick={fetchInvoices}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Invoices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="PartiallyPaid">Partially Paid</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sortBy">Sort by</Label>
          <Select onValueChange={(value) => setSortBy(value as any)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date</SelectItem>
              <SelectItem value="invoiceNumber">Invoice Number</SelectItem>
              <SelectItem value="customerName">Customer Name</SelectItem>
              <SelectItem value="totalAmount">Total Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sortOrder">Order</Label>
          <Select onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')} value={sortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusBadgeColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/sales-invoices/${invoice.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

