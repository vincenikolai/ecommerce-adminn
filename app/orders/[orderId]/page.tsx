"use client";

import { useState, useEffect } from "react";
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
  params: { orderId: string };
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrder();
  }, [params.orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.orderId}`);
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
      const response = await fetch(`/api/orders/${params.orderId}`, {
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Confirmed":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-purple-100 text-purple-800";
      case "Shipped":
        return "bg-indigo-100 text-indigo-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canCancelOrder = (status: OrderStatus) => {
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
                  Payment Status
                </p>
                <p className="text-sm text-gray-600">{order.paymentStatus}</p>
              </div>
              {order.approvedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Approved At
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.approvedAt)}
                  </p>
                </div>
              )}
              {order.cancelledAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Cancelled At
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.cancelledAt)}
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
                  {item.product?.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
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
                      ${item.unitPrice.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: ${item.totalPrice.toFixed(2)}
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
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </Card>

          {/* Order History */}
          {order.orderHistory && order.orderHistory.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order History
              </h2>
              <div className="space-y-3">
                {order.orderHistory.map((history) => (
                  <div
                    key={history.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {history.status}
                      </p>
                      {history.notes && (
                        <p className="text-sm text-gray-600">{history.notes}</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(history.changedAt)}
                    </p>
                  </div>
                ))}
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
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  ${order.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  ${order.shippingCost.toFixed(2)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">
                    -${order.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Payment: {order.paymentMethod}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Delivery: {order.deliveryMethod}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Status: {order.deliveryStatus}
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

