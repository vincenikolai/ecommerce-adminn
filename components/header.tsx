"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Session } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";
import { Menu, X } from "lucide-react"; // Import Menu and X icons

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole =
  "supplier_management_manager"; // Renamed role constant
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // New role constant
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";
const ORDER_MANAGER_ROLE: UserRole = "order_manager";
const PRODUCTION_MANAGER_ROLE: UserRole = "production_manager";
const SALES_STAFF_ROLE: UserRole = "sales_staff";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null); // New state for user role
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for mobile menu
  const [showAdminDropdown, setShowAdminDropdown] = useState(false); // New state for admin dropdown
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, role") // Fetch role as well
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profile) {
          setFirstName(profile.first_name || "");
          setLastName(profile.last_name || "");
          setUserRole(profile.role); // Set the user's role
        }
      }
    };

    getSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        supabase
          .from("profiles")
          .select("first_name, last_name, role") // Fetch role on auth state change
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error(
                "Error fetching profile on auth state change:",
                error
              );
            } else if (profile) {
              setFirstName(profile.first_name || "");
              setLastName(profile.last_name || "");
              setUserRole(profile.role);
            }
          });
      } else {
        setFirstName("");
        setLastName("");
        setUserRole(null); // Clear role on sign out
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setShowAdminDropdown(false); // Close dropdown when mobile menu is toggled
  };

  const toggleAdminDropdown = () => {
    setShowAdminDropdown(!showAdminDropdown);
  };

  const closeAdminDropdown = () => {
    setShowAdminDropdown(false);
  };

  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Helper function to get link classes
  const getLinkClasses = (href: string) => {
    const isActive = isActiveLink(href);
    return `relative px-3 py-2 rounded-md transition-all duration-200 font-medium ${
      isActive
        ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
        : "text-gray-700 hover:text-blue-600 hover:bg-blue-50 hover:border-b-2 hover:border-blue-300"
    }`;
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 md:px-8">
      <div className="flex items-center gap-x-3">
        <Link href="/" className="flex items-center gap-x-2">
          <Image
            src="/logo.png"
            alt="East LA Chemicals Logo"
            width={63}
            height={45}
            className="rounded-lg shadow-sm"
          />
          <span className="font-bold text-xl tracking-wide hidden md:block text-gray-900">
            East LA Chemicals
          </span>
        </Link>
      </div>

      {/* Hamburger menu for mobile */}
      <div className="md:hidden flex items-center z-20">
        <Button
          variant="ghost"
          onClick={toggleMenu}
          className="focus:outline-none"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleMenu} // Close menu when clicking overlay
        ></div>
      )}

      <nav
        className={`fixed md:relative top-0 md:top-auto bottom-0 left-0 h-full md:h-auto w-64 md:w-auto bg-white shadow-md md:shadow-none p-4 md:p-0 transition-transform duration-300 ease-in-out transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:flex flex-1 justify-center z-20`}
      >
        <ul className="flex flex-col md:flex-row gap-2 md:gap-1 text-base font-medium md:items-center items-start w-full md:w-auto">
          <li>
            <Link
              href="/"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/")}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/products"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/products")}
            >
              Products
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/contact")}
            >
              Contact us
            </Link>
          </li>
          <li>
            <Link
              href="/reviews"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/reviews")}
            >
              Reviews
            </Link>
          </li>
          <li>
            <Link
              href="/cart"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/cart")}
            >
              Cart
            </Link>
          </li>
          <li>
            <Link
              href="/orders"
              onClick={() => {
                setIsMenuOpen(false);
                closeAdminDropdown();
              }}
              className={getLinkClasses("/orders")}
            >
              My Orders
            </Link>
          </li>
          {(session && userRole === "admin") ||
          (session && userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE) ||
          (session && userRole === RAW_MATERIAL_MANAGER_ROLE) ||
          (session && userRole === SALES_QUOTATION_MANAGER_ROLE) || // Updated role check
          (session && userRole === PURCHASING_MANAGER_ROLE) ||
          (session && userRole === WAREHOUSE_STAFF_ROLE) ||
          (session && userRole === FINANCE_MANAGER_ROLE) ||
          (session && userRole === ORDER_MANAGER_ROLE) ||
          (session && userRole === PRODUCTION_MANAGER_ROLE) ||
          (session && userRole === SALES_STAFF_ROLE) ? (
            <li className="relative">
              <Button
                onClick={toggleAdminDropdown}
                className={`flex items-center space-x-1 focus:outline-none transition-all duration-200 ${
                  pathname.startsWith("/dashboard")
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-transparent text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                <span>Dashboard</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${
                    showAdminDropdown ? "rotate-180" : "rotate-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </Button>
              {showAdminDropdown && (
                <ul
                  className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30"
                  onMouseLeave={closeAdminDropdown} // Close if mouse leaves dropdown
                >
                  {userRole === "admin" && (
                    <>
                      <li>
                        <Link
                          href="/dashboard/users"
                          className={`block px-4 py-2 transition-all duration-200 ${
                            pathname === "/dashboard/users"
                              ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                              : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                          }`}
                          onClick={() => {
                            setIsMenuOpen(false);
                            closeAdminDropdown();
                          }}
                        >
                          User Management
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/dashboard/products"
                          className={`block px-4 py-2 transition-all duration-200 ${
                            pathname === "/dashboard/products"
                              ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                              : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                          }`}
                          onClick={() => {
                            setIsMenuOpen(false);
                            closeAdminDropdown();
                          }}
                        >
                          Product Management
                        </Link>
                      </li>
                    </>
                  )}
                  {userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE && (
                    <li>
                      <Link
                        href="/dashboard/supplier-management"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/supplier-management"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Supplier Management
                      </Link>
                    </li>
                  )}
                  {userRole === RAW_MATERIAL_MANAGER_ROLE && (
                    <li>
                      <Link
                        href="/dashboard/raw-material-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/raw-material-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Raw Material Management
                      </Link>
                    </li>
                  )}
                  {userRole === SALES_QUOTATION_MANAGER_ROLE && (
                    <>
                      <li>
                        <Link
                          href="/dashboard/purchase-quotation-manager"
                          className={`block px-4 py-2 transition-all duration-200 ${
                            pathname === "/dashboard/purchase-quotation-manager"
                              ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                              : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                          }`}
                          onClick={() => {
                            setIsMenuOpen(false);
                            closeAdminDropdown();
                          }}
                        >
                          Sales Quotation Manager
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/dashboard/sales-order-manager"
                          className={`block px-4 py-2 transition-all duration-200 ${
                            pathname === "/dashboard/sales-order-manager"
                              ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                              : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                          }`}
                          onClick={() => {
                            setIsMenuOpen(false);
                            closeAdminDropdown();
                          }}
                        >
                          Sales Order Manager
                        </Link>
                      </li>
                    </>
                  )}
                  {userRole === PURCHASING_MANAGER_ROLE && (
                    <li>
                      <Link
                        href="/dashboard/po-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/po-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        PO Manager
                      </Link>
                    </li>
                  )}
                  {userRole === WAREHOUSE_STAFF_ROLE && (
                    <li>
                      <Link
                        href="/dashboard/receiving-report-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/receiving-report-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Receiving Report Manager
                      </Link>
                    </li>
                  )}
                  {userRole === FINANCE_MANAGER_ROLE && (
                    <li>
                      <Link
                        href="/dashboard/purchase-invoice-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/purchase-invoice-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Purchase Invoice Manager
                      </Link>
                    </li>
                  )}
                  {(userRole === "admin" ||
                    userRole === ORDER_MANAGER_ROLE ||
                    userRole === SALES_STAFF_ROLE) && (
                    <li>
                      <Link
                        href="/dashboard/order-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/order-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Order Management
                      </Link>
                    </li>
                  )}
                  {(userRole === "admin" ||
                    userRole === PRODUCTION_MANAGER_ROLE) && (
                    <li>
                      <Link
                        href="/dashboard/production-manager"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/production-manager"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Production Management
                      </Link>
                    </li>
                  )}
                  {(userRole === "admin" ||
                    userRole === ORDER_MANAGER_ROLE ||
                    userRole === SALES_STAFF_ROLE) && (
                    <li>
                      <Link
                        href="/dashboard/bulk-orders"
                        className={`block px-4 py-2 transition-all duration-200 ${
                          pathname === "/dashboard/bulk-orders"
                            ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600 font-medium"
                            : "text-gray-800 hover:text-blue-600 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          closeAdminDropdown();
                        }}
                      >
                        Bulk Orders
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ) : null}
          <li className="md:ml-auto w-full md:w-auto mt-4 md:mt-0">
            <Link href="/order-now" className="block">
              <span className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors text-center block md:inline-block">
                Order now!
              </span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="hidden md:flex items-center gap-x-4">
        {session ? (
          <div className="flex flex-col items-end">
            {(firstName || lastName) && (
              <span className="text-sm">
                Hello {firstName} {lastName}
              </span>
            )}
            <SignOutButton />
          </div>
        ) : (
          <>
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Sign up</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
