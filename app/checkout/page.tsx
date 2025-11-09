"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Cart, Address, PaymentMethod, DeliveryMethod } from "@/types/order";
import { toast } from "react-hot-toast";

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Form state
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
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("Standard");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
      } else {
        console.error("Failed to fetch cart");
        router.push("/cart");
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      router.push("/cart");
    } finally {
      setLoading(false);
    }
  };

  const handleBillingAddressChange = (field: keyof Address, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleShippingAddressChange = (field: keyof Address, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce(
      (total, item) => total + (item.product?.price || 0) * item.quantity,
      0
    );
  };

  const calculateTax = () => {
    return calculateTotal() * 0.1; // 10% tax
  };

  const calculateShipping = () => {
    switch (deliveryMethod) {
      case "Express":
        return 15;
      case "Overnight":
        return 25;
      case "Pickup":
        return 0;
      default:
        return 5;
    }
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax() + calculateShipping();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart?.items || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        shippingAddress,
        billingAddress: useSameAddress ? shippingAddress : billingAddress,
        paymentMethod,
        deliveryMethod,
        notes: notes || undefined,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Order placed successfully!");
        router.push(`/orders/${result.order.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
    }
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

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h1>
          <p className="text-gray-600 mb-6">Add some products to get started</p>
          <Button onClick={() => router.push("/products")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Information */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Customer Information
            </h2>
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
          </Card>

          {/* Shipping Address */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Shipping Address
            </h2>
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
          </Card>

          {/* Billing Address */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Billing Address
            </h2>
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
          </Card>

          {/* Payment & Delivery */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Payment & Delivery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deliveryMethod">Delivery Method *</Label>
                <Select
                  value={deliveryMethod}
                  onValueChange={(value: DeliveryMethod) =>
                    setDeliveryMethod(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">
                      Standard (5-7 days) - $5
                    </SelectItem>
                    <SelectItem value="Express">
                      Express (2-3 days) - $15
                    </SelectItem>
                    <SelectItem value="Overnight">
                      Overnight (1 day) - $25
                    </SelectItem>
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
                placeholder="Any special instructions for your order..."
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product?.name} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span className="font-medium">
                    ${calculateTax().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    ${calculateShipping().toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={submitting}>
              {submitting ? "Placing Order..." : "Place Order"}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}

