"use client";

import { useEffect, useState } from "react";
import {
  createClientComponentClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { UserProfile, UserRole } from "@/types/user";
import { Button } from "@/components/ui/button";
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
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SALES_MANAGER_ROLE: UserRole = "sales_manager";

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: Address;
  billingAddress: Address;
  status: string;
  paymentMethod: string;
  deliveryMethod: string;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  items?: OrderItem[];
}

export default function SalesQuotationPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'orderNumber' | 'customerName' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form states for creating/editing an order
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [billingAddress, setBillingAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("Standard");
  const [notes, setNotes] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { product: Product; quantity: number }>>(new Map());
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  useEffect(() => {
    const getSessionAndRole = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Error fetching session: " + sessionError.message);
        setIsLoading(false);
        return;
      }
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
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

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }
      const data: Product[] = await response.json();
      setProducts(data); // Products API already filters by isActive
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      toast.error(
        "Error loading products: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      
      const response = await fetch(`/api/admin/purchase-quotations/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch orders");
      }
      const data: CustomerOrder[] = await response.json();
      setOrders(data);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      toast.error(
        "Error: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SALES_MANAGER_ROLE) {
      fetchProducts();
      fetchOrders();
    }
  }, [session, userRole, statusFilter, sortBy, sortOrder]);

  const handleBillingAddressChange = (field: keyof Address, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleShippingAddressChange = (field: keyof Address, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId);
      if (existing) {
        newMap.set(productId, { ...existing, quantity: existing.quantity + 1 });
      } else {
        newMap.set(productId, { product, quantity: 1 });
      }
      return newMap;
      });
  };

  const handleUpdateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveProduct(productId);
      return;
      }
    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId);
      if (existing) {
        newMap.set(productId, { ...existing, quantity });
      }
      return newMap;
    });
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const calculateSubtotal = () => {
    let total = 0;
    selectedProducts.forEach(({ product, quantity }) => {
      total += product.price * quantity;
    });
    return total;
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateShipping = () => {
    switch (deliveryMethod) {
      case "Express":
        return 15;
      case "Overnight":
        return 25;
      case "Pickup":
        return 0;
      case "Standard":
        return 5;
      default:
        return 5;
    }
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateShipping();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProducts.size === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    if (!customerName || !customerEmail) {
      toast.error("Please fill in customer name and email");
      return;
    }

    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
      toast.error("Please fill in all shipping address fields");
      return;
    }

    const orderData = {
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      shippingAddress,
      billingAddress: useSameAddress ? shippingAddress : billingAddress,
      paymentMethod,
      deliveryMethod,
      totalAmount: calculateGrandTotal(),
      taxAmount: calculateTax(),
      shippingAmount: calculateShipping(),
      notes: notes || null,
      status: "Quoted",
      items: Array.from(selectedProducts.entries()).map(([productId, { product, quantity }]) => ({
        productId,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      })),
    };

    try {
      const url = editingOrderId
        ? `/api/admin/purchase-quotations/update?id=${editingOrderId}`
        : "/api/admin/purchase-quotations/create";
      const method = editingOrderId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingOrderId ? "update" : "create"} order`);
      }

      toast.success(`Order ${editingOrderId ? "updated" : "created"} successfully!`);
      handleCancelEdit();
      fetchOrders();
    } catch (error: unknown) {
      console.error(`Error ${editingOrderId ? "updating" : "creating"} order:`, error);
      toast.error(
        `Error ${editingOrderId ? "updating" : "creating"} order: ` +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const handleEditOrder = (order: CustomerOrder) => {
    setEditingOrderId(order.id);
    setCustomerName(order.customerName);
    setCustomerEmail(order.customerEmail);
    setCustomerPhone(order.customerPhone || "");
    setShippingAddress(order.shippingAddress);
    setBillingAddress(order.billingAddress);
    setUseSameAddress(JSON.stringify(order.shippingAddress) === JSON.stringify(order.billingAddress));
    setPaymentMethod(order.paymentMethod);
    setDeliveryMethod(order.deliveryMethod);
    setNotes(order.notes || "");

    // Set selected products from order items
    const productMap = new Map<string, { product: Product; quantity: number }>();
    if (order.items) {
      order.items.forEach((item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          productMap.set(item.productId, { product, quantity: item.quantity });
        }
      });
    }
    setSelectedProducts(productMap);
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setShippingAddress({ street: "", city: "", state: "", zipCode: "", country: "" });
    setBillingAddress({ street: "", city: "", state: "", zipCode: "", country: "" });
    setUseSameAddress(true);
    setPaymentMethod("Cash");
    setDeliveryMethod("Standard");
    setNotes("");
    setSelectedProducts(new Map());
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/purchase-quotations/delete?id=${orderId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete order");
      }

      toast.success("Order deleted successfully!");
      fetchOrders();
    } catch (error: unknown) {
      console.error("Error deleting order:", error);
      toast.error(
        "Error deleting order: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const quotedOrders = orders.filter(o => o.status === 'Quoted');
    if (selectedOrderIds.size === quotedOrders.length) {
      // Deselect all
      setSelectedOrderIds(new Set());
    } else {
      // Select all quoted orders
      setSelectedOrderIds(new Set(quotedOrders.map(o => o.id)));
    }
  };

  const handleConvertToPending = () => {
    if (selectedOrderIds.size === 0) {
      toast.error("Please select at least one order to convert");
      return;
    }

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const quotedOrders = selectedOrders.filter(o => o.status === 'Quoted');
    
    if (quotedOrders.length === 0) {
      toast.error("Please select orders with 'Quoted' status");
      return;
    }

    setShowConvertDialog(true);
  };

  const confirmConvertToPending = async () => {
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const quotedOrders = selectedOrders.filter(o => o.status === 'Quoted');

    try {
      const response = await fetch("/api/admin/purchase-quotations/convert-to-pending", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
          }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to convert orders");
      }

      toast.success(`Successfully converted ${quotedOrders.length} order(s) to Pending!`);
      setSelectedOrderIds(new Set());
      setShowConvertDialog(false);
      fetchOrders();
    } catch (error: unknown) {
      console.error("Error converting orders:", error);
      toast.error(
        "Error converting orders: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
      setShowConvertDialog(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Quoted':
        return 'bg-purple-100 text-purple-800';
      case 'Paid':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading order data...</div>;
  }

  if (!session || userRole !== SALES_MANAGER_ROLE) {
    return (
      <div className="p-6 text-red-500">
        Access Denied: You do not have "Sales Manager" privileges to
        view this page.
      </div>
    );
  }

    return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Quotation Manager</h1>
        {!editingOrderId && (
          <Button onClick={handleCancelEdit} variant="outline">
            Clear Form
          </Button>
        )}
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Quoted">Quoted</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: any) => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="orderNumber">Order Number</SelectItem>
              <SelectItem value="customerName">Customer Name</SelectItem>
              <SelectItem value="totalAmount">Total Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Select onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)} value={sortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <p className="text-sm text-yellow-800">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">
            {orders.filter(o => o.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <p className="text-sm text-purple-800">Quoted</p>
          <p className="text-2xl font-bold text-purple-900">
            {orders.filter(o => o.status === 'Quoted').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-800">Paid</p>
          <p className="text-2xl font-bold text-blue-900">
            {orders.filter(o => o.status === 'Paid').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">Completed</p>
          <p className="text-2xl font-bold text-green-900">
            {orders.filter(o => o.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Create/Edit Order Form */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingOrderId ? "Edit Sales Quotation" : "Create New Sales Quotation"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer Info & Addresses */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={shippingAddress.street}
                      onChange={(e) =>
                        handleShippingAddressChange("street", e.target.value)
                      }
                      required
                    />
          </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                      <Label htmlFor="city">City *</Label>
            <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          handleShippingAddressChange("city", e.target.value)
                        }
              required
            />
          </div>
          <div>
                      <Label htmlFor="state">State *</Label>
            <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) =>
                          handleShippingAddressChange("state", e.target.value)
                        }
              required
            />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={(e) =>
                          handleShippingAddressChange("zipCode", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) =>
                          handleShippingAddressChange("country", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
          </div>
        </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="useSameAddress"
                    checked={useSameAddress}
                    onCheckedChange={(checked) =>
                      setUseSameAddress(checked as boolean)
                    }
                  />
                  <Label htmlFor="useSameAddress">Same as shipping address</Label>
          </div>

                {!useSameAddress && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="billingStreet">Street Address *</Label>
                      <Input
                        id="billingStreet"
                        value={billingAddress.street}
                        onChange={(e) =>
                          handleBillingAddressChange("street", e.target.value)
                        }
                        required={!useSameAddress}
                      />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                        <Label htmlFor="billingCity">City *</Label>
                        <Input
                          id="billingCity"
                          value={billingAddress.city}
                          onChange={(e) =>
                            handleBillingAddressChange("city", e.target.value)
                          }
                          required={!useSameAddress}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingState">State *</Label>
                        <Input
                          id="billingState"
                          value={billingAddress.state}
                          onChange={(e) =>
                            handleBillingAddressChange("state", e.target.value)
                          }
                          required={!useSameAddress}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingZipCode">ZIP Code *</Label>
                        <Input
                          id="billingZipCode"
                          value={billingAddress.zipCode}
                          onChange={(e) =>
                            handleBillingAddressChange("zipCode", e.target.value)
                          }
                          required={!useSameAddress}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingCountry">Country *</Label>
                        <Input
                          id="billingCountry"
                          value={billingAddress.country}
                          onChange={(e) =>
                            handleBillingAddressChange("country", e.target.value)
                          }
                          required={!useSameAddress}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Delivery */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment & Delivery</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                        <SelectValue />
                </SelectTrigger>
                <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
                  <div>
                    <Label htmlFor="deliveryMethod">Delivery Method *</Label>
                    <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard (5-7 days) - ₱5</SelectItem>
                        <SelectItem value="Express">Express (2-3 days) - ₱15</SelectItem>
                        <SelectItem value="Overnight">Overnight (1 day) - ₱25</SelectItem>
                        <SelectItem value="Pickup">Pickup - Free</SelectItem>
                      </SelectContent>
                    </Select>
          </div>
                </div>
        <div className="mt-4">
                  <Label htmlFor="notes">Order Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for this order..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Products & Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Add Products */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Add Products</h3>
                <Select onValueChange={handleAddProduct} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ₱{product.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Selected Products */}
                {selectedProducts.size > 0 && (
                  <div className="mt-4 space-y-2">
                    {Array.from(selectedProducts.entries()).map(([productId, { product, quantity }]) => (
                      <div key={productId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">₱{product.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="1"
                            value={quantity}
                    onChange={(e) =>
                              handleUpdateProductQuantity(productId, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-20"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                            onClick={() => handleRemoveProduct(productId)}
                  >
                    Remove
                  </Button>
                        </div>
                      </div>
              ))}
                  </div>
          )}
        </div>

              {/* Order Summary */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₱{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (10%)</span>
                    <span className="font-medium">₱{calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">₱{calculateShipping().toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₱{calculateGrandTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={selectedProducts.size === 0}>
                  {editingOrderId ? "Update Order" : "Create Order"}
        </Button>
                {editingOrderId && (
          <Button
            type="button"
            variant="outline"
                    onClick={handleCancelEdit}
                    className="w-full mt-2"
          >
            Cancel Edit
          </Button>
        )}
              </Card>
            </div>
          </div>
      </form>
      </Card>

      {/* Existing Quotations Table */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Existing Quotations</h2>
        {selectedOrderIds.size > 0 && (
      <Button
            onClick={handleConvertToPending}
            className="bg-green-600 hover:bg-green-700"
      >
            Convert to Order
      </Button>
        )}
      </div>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">
                  {orders.filter(o => o.status === 'Quoted').length > 0 && (
                    <Checkbox
                      checked={orders.filter(o => o.status === 'Quoted').length > 0 && 
                              selectedOrderIds.size === orders.filter(o => o.status === 'Quoted').length}
                      onCheckedChange={handleSelectAll}
                    />
                  )}
                </th>
                <th className="py-3 px-4 border-b text-left font-semibold">Order #</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Customer</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date Created</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Total Amount</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Products</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    {order.status === 'Quoted' && (
                      <Checkbox
                        checked={selectedOrderIds.has(order.id)}
                        onCheckedChange={() => handleToggleOrderSelection(order.id)}
                      />
                    )}
                    </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{order.orderNumber || `ORD-${order.id.substring(0, 8)}`}</div>
                    <div className="text-xs text-gray-500">{order.id.substring(0, 8)}...</div>
                    </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                    </td>
                  <td className="py-3 px-4 border-b">
                    <Badge className={getStatusBadgeColor(order.status)}>
                      {order.status}
                    </Badge>
                    </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 border-b font-medium">
                    ₱{(order.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {order.items && order.items.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.productId.substring(0, 8)}... x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400 italic">No products</span>
                    )}
                    </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditOrder(order)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        Delete
                      </Button>
                    </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Convert to Order Confirmation Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to convert {selectedOrderIds.size} selected order(s) to an order?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-2">
              This action will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Change the order status from "Quoted" to "Pending" in the orders database</li>
              <li className="text-red-600 font-semibold">Permanently delete the selected orders from the PurchaseQuotation database</li>
              <li>Remove all associated quotation items</li>
            </ul>
            <p className="text-sm text-red-600 font-semibold mt-4">
              ⚠️ This action cannot be undone. The orders will be permanently removed from PurchaseQuotation.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmConvertToPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Convert to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
