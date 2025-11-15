'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshCw, DollarSign, TrendingUp, FileText, Calendar, ShoppingCart } from 'lucide-react';

const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

interface PurchasingReportSummary {
  grossPurchases: number;
  netPurchases: number;
  totalTaxAmount: number;
  totalPurchaseOrders: number;
  approvedOrders: number;
  completedOrders: number;
  pendingOrders: number;
  averagePurchaseOrderValue: number;
}

interface PurchaseOrder {
  id: string;
  poReferenceNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  status: string;
  supplier?: {
    id: string;
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
  };
}

interface PurchasingReportData {
  purchaseOrders: PurchaseOrder[];
  summary: PurchasingReportSummary;
}

export default function PurchasingReportPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<PurchasingReportData | null>(null);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/admin/purchasing-report?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch purchasing report");
      }
      const data: PurchasingReportData = await response.json();
      setReportData(data);
    } catch (error: unknown) {
      console.error("Error in fetchReport:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === PURCHASING_MANAGER_ROLE) {
      fetchReport();
    }
  }, [session, userRole, statusFilter, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate subtotal and tax for each purchase order
  const calculateSubtotal = (totalAmount: number) => {
    return totalAmount * 0.88; // 88% of totalAmount
  };

  const calculateTax = (totalAmount: number) => {
    return totalAmount * 0.12; // 12% of totalAmount
  };

  if (isLoading) {
    return <div className="p-6">Loading purchasing report...</div>;
  }

  if (!session || userRole !== PURCHASING_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Purchasing Manager" privileges to view this page.</div>;
  }

  const summary = reportData?.summary || {
    grossPurchases: 0,
    netPurchases: 0,
    totalTaxAmount: 0,
    totalPurchaseOrders: 0,
    approvedOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    averagePurchaseOrderValue: 0,
  };

  const purchaseOrders = reportData?.purchaseOrders || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Purchasing Report</h1>
          <p className="text-sm text-gray-600 mt-1">
            View gross and net purchases with detailed purchase order breakdown
          </p>
        </div>
        <Button variant="outline" onClick={fetchReport}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[180px] px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[180px] px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Gross Purchases</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {formatCurrency(summary.grossPurchases)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Total purchases (including 12% tax)
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Net Purchases</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {formatCurrency(summary.netPurchases)}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Subtotal (before 12% tax)
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Purchase Orders</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {summary.totalPurchaseOrders}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                {summary.approvedOrders} approved, {summary.completedOrders} completed
              </p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Average PO Value</p>
              <p className="text-2xl font-bold text-orange-900 mt-2">
                {formatCurrency(summary.averagePurchaseOrderValue)}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Average purchase order value
              </p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Tax Summary */}
      <Card className="p-6 bg-yellow-50 border-yellow-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Total Tax (12%)</p>
            <p className="text-2xl font-bold text-yellow-900 mt-2">
              {formatCurrency(summary.totalTaxAmount)}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              12% tax on all purchase orders
            </p>
          </div>
          <ShoppingCart className="h-8 w-8 text-yellow-600" />
        </div>
      </Card>

      {/* Purchase Orders Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Purchase Order Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax (12%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total (Gross)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const subtotal = calculateSubtotal(po.totalAmount);
                  const tax = calculateTax(po.totalAmount);
                  
                  return (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.poReferenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{po.supplier?.company_name || 'N/A'}</div>
                        {po.supplier?.contact_person && (
                          <div className="text-xs text-gray-400">{po.supplier.contact_person}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(po.orderDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(po.deliveryDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(subtotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(po.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadgeColor(po.status)}>
                          {po.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

