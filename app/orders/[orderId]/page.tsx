"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, CreditCard, Truck } from "lucide-react";
import { Order, OrderStatus } from "@/types/order";
import { toast } from "react-hot-toast";

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
      } else {
        console.error("Failed to fetch order");
        router.push("/orders");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Cancelled",
          notes: "Cancelled by customer",
        }),
      });

      if (response.ok) {
        toast.success("Order cancelled successfully");
        fetchOrder(); // Refresh order
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Quoted":
        return "bg-purple-100 text-purple-800";
      case "Paid":
        return "bg-blue-100 text-blue-800";
      case "On Delivery":
        return "bg-orange-100 text-orange-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };


  const canCancelOrder = (status: string) => {
    return status === "Pending";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order not found
          </h1>
          <p className="text-gray-600 mb-6">
            The order you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/orders")}>Back to Orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="outline" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          Order #{order.orderNumber}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Order Status</h2>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Order Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Payment Method
                </p>
                <p className="text-sm text-gray-600">{order.paymentMethod || 'Cash'}</p>
              </div>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Last Updated
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.updatedAt)}
                  </p>
                </div>
              )}
            </div>
            {canCancelOrder(order.status) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={cancelOrder}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel Order
                </Button>
              </div>
            )}
          </Card>

          {/* Order Items */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 p-4 border rounded-lg"
                >
                  {item.product?.imageUrl && item.product.imageUrl.trim() !== "" ? (
                    <img
                      src={`${item.product.imageUrl}${item.product.imageUrl.includes('?') ? '&' : '?'}v=${Date.now()}`}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      key={`${item.id}-${item.product.imageUrl}`}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.product?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {item.product?.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₱{((item as any).unitPrice || (item as any).price || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: ₱{(((item as any).unitPrice || (item as any).price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address
            </h2>
            <div className="text-sm text-gray-600">
              {order.shippingAddress && typeof order.shippingAddress === 'object' ? (
                <>
                  <p>{(order.shippingAddress as any).street || ''}</p>
                  <p>
                    {(order.shippingAddress as any).city || ''}, {(order.shippingAddress as any).state || ''}{" "}
                    {(order.shippingAddress as any).zipCode || ''}
                  </p>
                  <p>{(order.shippingAddress as any).country || ''}</p>
                </>
              ) : (
                <p>No shipping address provided</p>
              )}
            </div>
          </Card>

          {/* Order History - Only show if orderHistory exists */}
          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Items Summary
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Total Items: {order.items.length}
                </p>
                <p className="text-sm text-gray-600">
                  Total Quantity: {order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  ₱{((order.totalAmount || 0) - (order.taxAmount || 0) - (order.shippingAmount || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  ₱{(order.taxAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  ₱{(order.shippingAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₱{(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Payment: {order.paymentMethod || 'Cash'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Delivery: {order.deliveryMethod || 'Standard'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Status: {order.status || 'Pending'}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Order Notes</h3>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

