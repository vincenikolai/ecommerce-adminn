"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, MapPin, CreditCard, Truck, Download } from "lucide-react";
import { SalesInvoice } from "@/types/sales-invoice";
import { toast } from "react-hot-toast";

export default function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/admin/sales-invoices/${invoiceId}`);
      if (response.ok) {
        const invoiceData = await response.json();
        setInvoice(invoiceData);
      } else {
        const error = await response.json();
        console.error("Failed to fetch invoice:", error);
        toast.error(error.error || "Failed to fetch invoice");
        router.push("/dashboard/sales-invoices");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to fetch invoice");
      router.push("/dashboard/sales-invoices");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Unpaid":
        return "bg-red-100 text-red-800";
      case "PartiallyPaid":
        return "bg-yellow-100 text-yellow-800";
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Overdue":
        return "bg-orange-100 text-orange-800";
      case "Cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invoice not found
          </h1>
          <p className="text-gray-600 mb-6">
            The invoice you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/dashboard/sales-invoices")}>
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/sales-invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Invoice #{invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Status */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invoice Status</h2>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Invoice Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Due Date</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Order Number</p>
                <p className="text-sm text-gray-600">{invoice.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Payment Method
                </p>
                <p className="text-sm text-gray-600">{invoice.paymentMethod}</p>
              </div>
            </div>
          </Card>

          {/* Invoice Items */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Invoice Items
            </h2>
            <div className="space-y-4">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg"
                  >
                    {item.productId && (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.productName}
                      </h3>
                      {item.productDescription && (
                        <p className="text-sm text-gray-600">
                          {item.productDescription}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No items found</p>
              )}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address
            </h2>
            <div className="text-sm text-gray-600">
              {invoice.shippingAddress && typeof invoice.shippingAddress === 'object' ? (
                <>
                  <p>{(invoice.shippingAddress as any).street || ''}</p>
                  <p>
                    {(invoice.shippingAddress as any).city || ''}, {(invoice.shippingAddress as any).state || ''}{" "}
                    {(invoice.shippingAddress as any).zipCode || ''}
                  </p>
                  <p>{(invoice.shippingAddress as any).country || ''}</p>
                </>
              ) : (
                <p>No shipping address provided</p>
              )}
            </div>
          </Card>

          {/* Billing Address */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Billing Address
            </h2>
            <div className="text-sm text-gray-600">
              {invoice.billingAddress && typeof invoice.billingAddress === 'object' ? (
                <>
                  <p>{(invoice.billingAddress as any).street || ''}</p>
                  <p>
                    {(invoice.billingAddress as any).city || ''}, {(invoice.billingAddress as any).state || ''}{" "}
                    {(invoice.billingAddress as any).zipCode || ''}
                  </p>
                  <p>{(invoice.billingAddress as any).country || ''}</p>
                </>
              ) : (
                <p>No billing address provided</p>
              )}
            </div>
          </Card>
        </div>

        {/* Invoice Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Invoice Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  {formatCurrency(invoice.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {formatCurrency(invoice.shippingAmount)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Payment: {invoice.paymentMethod}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Delivery: {invoice.deliveryMethod}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Customer</p>
                <p className="text-sm text-gray-600">{invoice.customerName}</p>
                <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                {invoice.customerPhone && (
                  <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

