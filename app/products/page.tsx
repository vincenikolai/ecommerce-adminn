"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { CartPopup } from "@/components/modals/cart-popup";
import { ReviewPopup } from "@/components/modals/review-popup";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartPopupOpen, setIsCartPopupOpen] = useState(false);
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
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
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
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
