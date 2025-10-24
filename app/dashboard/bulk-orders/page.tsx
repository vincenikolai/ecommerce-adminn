"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Eye,
  CheckCircle,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  BulkOrder,
  CreateBulkOrderRequest,
  BulkOrderStatus,
} from "@/types/bulk-order";
import { Product } from "@/types/product";
import { toast } from "react-hot-toast";

export default function BulkOrdersPage() {
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isBackorderFilter, setIsBackorderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating bulk order
  const [formData, setFormData] = useState<CreateBulkOrderRequest>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
    items: [{ productId: "", quantity: 0 }],
  });

  useEffect(() => {
    fetchBulkOrders();
    fetchProducts();
  }, [statusFilter, isBackorderFilter, sortBy, sortOrder]);

  const fetchBulkOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (isBackorderFilter !== "all") {
        params.append("isBackorder", isBackorderFilter);
      }
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const response = await fetch(
        `/api/admin/bulk-orders?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setBulkOrders(data);
      } else {
        console.error("Failed to fetch bulk orders");
      }
    } catch (error) {
      console.error("Error fetching bulk orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleCreateBulkOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.customerName ||
      !formData.customerEmail ||
      formData.items.length === 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate items
    const validItems = formData.items.filter(
      (item) => item.productId && item.quantity > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/bulk-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          items: validItems,
        }),
      });

      if (response.ok) {
        toast.success("Bulk order created successfully");
        setIsCreateDialogOpen(false);
        setFormData({
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          notes: "",
          items: [{ productId: "", quantity: 0 }],
        });
        fetchBulkOrders(); // Refresh orders
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create bulk order");
      }
    } catch (error) {
      console.error("Error creating bulk order:", error);
      toast.error("Failed to create bulk order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const updateItem = (
    index: number,
    field: keyof (typeof formData.items)[0],
    value: string | number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status: BulkOrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-blue-100 text-blue-800";
      case "Processing":
        return "bg-purple-100 text-purple-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bulk Orders Management
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bulk Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bulk Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBulkOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Customer Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customerEmail: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Order Items *</Label>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          updateItem(index, "productId", value)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24"
                      />
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes for this bulk order..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {bulkOrders.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {bulkOrders.filter((o) => o.status === "Pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">
                {bulkOrders.filter((o) => o.status === "Processing").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Backorders</p>
              <p className="text-2xl font-bold text-gray-900">
                {bulkOrders.filter((o) => o.isBackorder).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <Select
            value={isBackorderFilter}
            onValueChange={setIsBackorderFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="true">Backorders</SelectItem>
              <SelectItem value="false">Regular Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="totalQuantity">Quantity</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="customerName">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Order:</label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Orders List */}
      <div className="space-y-4">
        {bulkOrders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {order.orderNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  Customer: {order.customerName} ({order.customerEmail})
                </p>
                <p className="text-sm text-gray-600">
                  Total Quantity: {order.totalQuantity}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                {order.isBackorder && (
                  <Badge className="bg-orange-100 text-orange-800">
                    Backorder
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="text-sm text-gray-600">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Items</p>
                <p className="text-sm text-gray-600">
                  {order.items.length} product
                  {order.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-600">
                  {order.customerPhone || "Not provided"}
                </p>
              </div>
            </div>

            {order.notes && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">Notes</p>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {bulkOrders.length === 0 && (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No bulk orders found
          </h2>
          <p className="text-gray-600 mb-4">
            Create your first bulk order to get started.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bulk Order
          </Button>
        </Card>
      )}
    </div>
  );
}

