"use client";

import { useState } from "react";
import { ReviewPopup } from "@/components/modals/review-popup";
export default function Page() {
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);

  const handleOpenReviewPopup = () => {
    setIsReviewPopupOpen(true);
  };

  const handleCloseReviewPopup = () => {
    setIsReviewPopupOpen(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/wallpaper.jpg')` }}
    >
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-6xl">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-200">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  LOOKING FOR A<br />
                  RELIABLE <span className="text-blue-600">CLEANING</span>
                  <br />
                  SOLUTION?
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Professional cleaning and sanitation solutions for businesses
                  across all industries. Quality products that deliver
                  exceptional results.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a
                    href="/products"
                    className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    SHOP NOW
                  </a>
                  <a
                    href="/contact"
                    className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
                  >
                    CONTACT US
                  </a>
                  <button
                    onClick={handleOpenReviewPopup}
                    className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
                  >
                    WRITE REVIEW
                  </button>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <img
                  src="/cleaning products.jpg"
                  alt="Cleaning Products"
                  className="rounded-2xl w-full max-w-md h-80 object-cover shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="px-4 pb-16">
        <div className="w-full max-w-6xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-200">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Industries We Serve
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                From food service to healthcare, we provide specialized cleaning
                solutions tailored to meet the unique needs of your industry.
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mx-auto mt-6"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group text-center">
                <div className="relative overflow-hidden rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <img
                    src="/food and bevarage.webp"
                    alt="Food and Beverage"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Food & Beverage
                </h3>
                <p className="text-gray-600 mb-4">
                  Specialized cleaning solutions for restaurants, cafes, and
                  food processing facilities.
                </p>
                <a
                  href="/products"
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Explore Products →
                </a>
              </div>

              <div className="group text-center">
                <div className="relative overflow-hidden rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <img
                    src="/office.jpg"
                    alt="Offices"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Corporate Offices
                </h3>
                <p className="text-gray-600 mb-4">
                  Professional cleaning products for modern office environments
                  and corporate facilities.
                </p>
                <a
                  href="/products"
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Explore Products →
                </a>
              </div>

              <div className="group text-center">
                <div className="relative overflow-hidden rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <img
                    src="/laundry.png"
                    alt="Laundry"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Laundry Services
                </h3>
                <p className="text-gray-600 mb-4">
                  High-performance detergents and fabric care solutions for
                  commercial laundry operations.
                </p>
                <a
                  href="/products"
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Explore Products →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Review Popup */}
      <ReviewPopup
        isOpen={isReviewPopupOpen}
        onClose={handleCloseReviewPopup}
      />
    </div>
  );
}
