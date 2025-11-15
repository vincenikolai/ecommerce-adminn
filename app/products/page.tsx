"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { CartPopup } from "@/components/modals/cart-popup";
import { ReviewPopup } from "@/components/modals/review-popup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  updatedAt?: string | Date;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartPopupOpen, setIsCartPopupOpen] = useState(false);
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const productsData = await response.json();
        const categories = Array.from(
          new Set(productsData.map((p: Product) => p.category))
        ).filter(Boolean) as string[];
        setAllCategories(categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (categoryFilter && categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }

      const response = await fetch(`/api/products?${params.toString()}`);
      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      } else {
        console.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProducts();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    // fetchProducts will be called by useEffect when categoryFilter changes
    // But we need to call it immediately for searchQuery
    setTimeout(() => fetchProducts(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleAddToCart = (product: Product) => {
    setSelectedProduct(product);
    setIsCartPopupOpen(true);
  };

  const handleCloseCartPopup = () => {
    setIsCartPopupOpen(false);
    setSelectedProduct(null);
  };

  const handleOpenReviewPopup = () => {
    setIsReviewPopupOpen(true);
  };

  const handleCloseReviewPopup = () => {
    setIsReviewPopupOpen(false);
  };
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('/wallpaper.jpg')` }}
    >
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {/* Header Section */}
        <section className="mb-12 text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 border border-gray-200 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[#0A2E6C] mb-4">
              Our Products
            </h1>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
              Discover our comprehensive range of professional cleaning and
              sanitation solutions. Each product is carefully formulated to meet
              the highest standards of quality and effectiveness.
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mx-auto mt-6"></div>
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className="mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search products by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-10 h-12 text-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-6 h-12"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </div>

              {/* Category Filter */}
              <div className="md:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    // fetchProducts will be called by useEffect
                  }}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Results Info */}
            {(searchQuery || categoryFilter !== "all") && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found {products.length} product{products.length !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {categoryFilter !== "all" && ` in ${categoryFilter}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Products Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600">Please try again later.</p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                {/* Product Image */}
                <div className="relative h-64 w-full overflow-hidden bg-gray-200">
                  {product.imageUrl && product.imageUrl.trim() !== "" ? (
                    // Use regular img for relative paths, Image component for external URLs
                    product.imageUrl.startsWith('/') || product.imageUrl.startsWith('./') ? (
                      <img
                        src={`${product.imageUrl}?v=${product.updatedAt ? new Date(product.updatedAt).getTime() : Math.random().toString(36).substring(7)}`}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          // If image fails to load, hide it and show placeholder
                          e.currentTarget.style.display = 'none';
                        }}
                        key={`${product.id}-${product.imageUrl}`}
                      />
                    ) : (
                      <Image
                        src={`${product.imageUrl}${product.imageUrl.includes('?') ? '&' : '?'}v=${product.updatedAt ? new Date(product.updatedAt).getTime() : Math.random().toString(36).substring(7)}`}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={false}
                        key={`${product.id}-${product.imageUrl}`}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg
                        className="w-24 h-24 text-gray-400"
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
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#0A2E6C] text-white px-3 py-1 rounded-full text-sm font-medium">
                      {product.category}
                    </span>
                  </div>
                  {/* Stock Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        product.stock > 10
                          ? "bg-green-100 text-green-800"
                          : product.stock > 0
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Out of stock"}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                    {product.name}
                  </h3>

                  <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                    {product.description}
                  </p>

                  {/* Price and Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-[#0A2E6C]">
                        ₱{product.price}
                      </span>
                      <span className="text-sm text-gray-500">per unit</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                        product.stock === 0
                          ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                      }`}
                    >
                      {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Call to Action */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-[#0A2E6C] to-blue-800 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Need Custom Solutions?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-3xl mx-auto leading-relaxed">
              We offer tailored cleaning and sanitation programs designed
              specifically for your business needs. Contact us for a
              consultation and customized product recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-white text-[#0A2E6C] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors duration-200 shadow-lg"
              >
                Get Custom Quote
              </a>
              <a
                href="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-[#0A2E6C] transition-all duration-200"
              >
                Contact Us
              </a>
              <button
                onClick={handleOpenReviewPopup}
                className="border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-[#0A2E6C] transition-all duration-200"
              >
                Write a Review
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Cart Popup */}
      <CartPopup
        product={selectedProduct}
        isOpen={isCartPopupOpen}
        onClose={handleCloseCartPopup}
      />

      {/* Review Popup */}
      <ReviewPopup
        isOpen={isReviewPopupOpen}
        onClose={handleCloseReviewPopup}
      />
    </div>
  );
}
