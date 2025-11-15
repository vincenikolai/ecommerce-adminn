'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Calendar, RefreshCw } from 'lucide-react';

const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";
const ADMIN_EMAIL = "eastlachemicals@gmail.com";

interface FinanceSummary {
  grossIncome: number;
  netIncome: number;
  grossExpenses: number;
  netExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalSalesInvoices: number;
  totalPurchaseOrders: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface FinanceReportData {
  summary: FinanceSummary;
  monthlyData: MonthlyData[];
  salesInvoices: any[];
  purchaseOrders: any[];
}

export default function FinancePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<FinanceReportData | null>(null);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  
  // Filters
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

  useEffect(() => {
    if (session && (userRole === FINANCE_MANAGER_ROLE || session.user?.email === ADMIN_EMAIL)) {
      fetchReport();
    }
  }, [session, userRole, startDate, endDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/admin/finance-report?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch finance report");
      }
      const data: FinanceReportData = await response.json();
      setReportData(data);
    } catch (error: unknown) {
      console.error("Error in fetchReport:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Calculate max value for chart scaling
  const getMaxValue = () => {
    if (!reportData?.monthlyData || reportData.monthlyData.length === 0) return 1000;
    const maxIncome = Math.max(...reportData.monthlyData.map(d => d.income));
    const maxExpenses = Math.max(...reportData.monthlyData.map(d => d.expenses));
    return Math.max(maxIncome, maxExpenses, 1000);
  };

  const maxValue = getMaxValue();
  const chartHeight = 300;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || (userRole !== FINANCE_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
    return (
      <div className="p-6 text-red-500">
        Access Denied: You do not have Finance Manager privileges to view this page.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-1">Income, Expenses, and Profit & Loss Analysis</p>
        </div>
        <Button onClick={fetchReport} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="startDate">Start Date</Label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="endDate">End Date</Label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={() => { setStartDate(''); setEndDate(''); }} variant="outline">
            Clear Filters
          </Button>
        </div>
      </Card>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Gross Income */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Gross Income</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {formatCurrency(reportData.summary.grossIncome)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Total revenue from sales
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </Card>

            {/* Gross Expenses */}
            <Card className="p-6 bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Gross Expenses</p>
                  <p className="text-2xl font-bold text-red-900 mt-2">
                    {formatCurrency(reportData.summary.grossExpenses)}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Total purchase costs
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </Card>

            {/* Gross Profit */}
            <Card className={`p-6 ${reportData.summary.grossProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${reportData.summary.grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>Gross Profit</p>
                  <p className={`text-2xl font-bold mt-2 ${reportData.summary.grossProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(reportData.summary.grossProfit)}
                  </p>
                  <p className={`text-xs mt-1 ${reportData.summary.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    Income - Expenses
                  </p>
                </div>
                {reportData.summary.grossProfit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </Card>

            {/* Net Profit */}
            <Card className={`p-6 ${reportData.summary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${reportData.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>Net Profit</p>
                  <p className={`text-2xl font-bold mt-2 ${reportData.summary.netProfit >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                    {formatCurrency(reportData.summary.netProfit)}
                  </p>
                  <p className={`text-xs mt-1 ${reportData.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    Net Income - Net Expenses
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${reportData.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
              </div>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Net Income</p>
                  <p className="text-xl font-bold text-gray-900 mt-2">
                    {formatCurrency(reportData.summary.netIncome)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Subtotal from sales (before tax & shipping)
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-gray-600" />
              </div>
            </Card>

            <Card className="p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Net Expenses</p>
                  <p className="text-xl font-bold text-gray-900 mt-2">
                    {formatCurrency(reportData.summary.netExpenses)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Subtotal from purchases (before tax)
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-gray-600" />
              </div>
            </Card>
          </div>

          {/* Charts */}
          {reportData.monthlyData && reportData.monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Income vs Expenses Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Income vs Expenses
                </h3>
                <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
                  <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
                    {reportData.monthlyData.map((data, index) => {
                      const totalBars = reportData.monthlyData.length;
                      const barSpacing = 800 / totalBars;
                      const barWidth = barSpacing * 0.35;
                      const x = (index * barSpacing) + (barSpacing / 2);
                      const incomeHeight = maxValue > 0 ? (data.income / maxValue) * chartHeight : 0;
                      const expensesHeight = maxValue > 0 ? (data.expenses / maxValue) * chartHeight : 0;

                      return (
                        <g key={data.month}>
                          {/* Income Bar */}
                          <rect
                            x={x - barWidth - 2}
                            y={chartHeight - incomeHeight}
                            width={barWidth}
                            height={incomeHeight}
                            fill="#3b82f6"
                            className="hover:opacity-80 transition-opacity"
                          />
                          {/* Expenses Bar */}
                          <rect
                            x={x + 2}
                            y={chartHeight - expensesHeight}
                            width={barWidth}
                            height={expensesHeight}
                            fill="#ef4444"
                            className="hover:opacity-80 transition-opacity"
                          />
                          {/* Month Label */}
                          <text
                            x={x}
                            y={chartHeight + 20}
                            textAnchor="middle"
                            className="text-xs fill-gray-600"
                            fontSize="10"
                          >
                            {formatMonth(data.month)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex gap-4 mt-8 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500"></div>
                      <span className="text-sm text-gray-600">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500"></div>
                      <span className="text-sm text-gray-600">Expenses</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Profit & Loss Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Profit & Loss
                </h3>
                <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
                  <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Zero line */}
                    <line
                      x1="0"
                      y1={chartHeight / 2}
                      x2="800"
                      y2={chartHeight / 2}
                      stroke="#9ca3af"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    {reportData.monthlyData.map((data, index) => {
                      const totalBars = reportData.monthlyData.length;
                      const barSpacing = 800 / totalBars;
                      const barWidth = barSpacing * 0.6;
                      const x = (index * barSpacing) + (barSpacing / 2);
                      const profitAbs = Math.abs(data.profit);
                      const maxProfitAbs = Math.max(...reportData.monthlyData.map(d => Math.abs(d.profit)), maxValue);
                      const barHeight = maxProfitAbs > 0 ? (profitAbs / maxProfitAbs) * (chartHeight / 2) : 0;
                      const isPositive = data.profit >= 0;
                      const y = isPositive ? chartHeight / 2 - barHeight : chartHeight / 2;

                      return (
                        <g key={data.month}>
                          {/* Profit/Loss Bar */}
                          <rect
                            x={x - barWidth / 2}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={isPositive ? "#10b981" : "#ef4444"}
                            className="hover:opacity-80 transition-opacity"
                          />
                          {/* Month Label */}
                          <text
                            x={x}
                            y={chartHeight + 20}
                            textAnchor="middle"
                            className="text-xs fill-gray-600"
                            fontSize="10"
                          >
                            {formatMonth(data.month)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex gap-4 mt-8 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500"></div>
                      <span className="text-sm text-gray-600">Profit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500"></div>
                      <span className="text-sm text-gray-600">Loss</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Transaction Counts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Invoices:</span>
                  <span className="font-semibold">{reportData.summary.totalSalesInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Income:</span>
                  <span className="font-semibold">{formatCurrency(reportData.summary.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Income:</span>
                  <span className="font-semibold">{formatCurrency(reportData.summary.netIncome)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Purchasing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Purchase Orders:</span>
                  <span className="font-semibold">{reportData.summary.totalPurchaseOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Expenses:</span>
                  <span className="font-semibold">{formatCurrency(reportData.summary.grossExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Expenses:</span>
                  <span className="font-semibold">{formatCurrency(reportData.summary.netExpenses)}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {!reportData && !isLoading && (
        <Card className="p-8 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No finance data available for the selected period.</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your date filters.</p>
        </Card>
      )}
    </div>
  );
}

