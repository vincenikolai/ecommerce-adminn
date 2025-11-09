"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Cart, CartItem } from "@/types/order";
import { toast } from "react-hot-toast";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

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
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setUpdating(itemId);
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart
        toast.success("Cart updated");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update cart");
      }
    } catch (error) {
      console.error("Error updating cart item:", error);
      toast.error("Failed to update cart");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart
        toast.success("Item removed from cart");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing cart item:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdating(null);
    }
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
    return 5; // Standard shipping
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax() + calculateShipping();
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
          <ShoppingBag className="mx-auto h-24 w-24 text-gray-400 mb-4" />
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex items-center space-x-4">
                  {item.product?.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.product?.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {item.product?.description}
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${item.product?.price?.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={updating === item.id || item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={
                        updating === item.id ||
                        (item.product?.stock || 0) < item.quantity + 1
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={updating === item.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Stock: {item.product?.stock || 0} available
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
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
            <Button
              className="w-full mt-6"
              onClick={() => router.push("/checkout")}
            >
              Proceed to Checkout
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => router.push("/products")}
            >
              Continue Shopping
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

