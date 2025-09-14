'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Session } from "@supabase/supabase-js";
import { UserProfile, UserRole } from '@/types/user';
import { Menu, X } from "lucide-react"; // Import Menu and X icons

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole = "supplier_management_manager"; // Renamed role constant
const PURCHASE_QUOTATION_MANAGER_ROLE: UserRole = "purchase_quotation_manager";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

export function Header() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null); // New state for user role
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for mobile menu
  const [showAdminDropdown, setShowAdminDropdown] = useState(false); // New state for admin dropdown
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, role') // Fetch role as well
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          setUserRole(profile.role); // Set the user's role
        }
      }
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .select('first_name, last_name, role') // Fetch role on auth state change
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error("Error fetching profile on auth state change:", error);
            } else if (profile) {
              setFirstName(profile.first_name || '');
              setLastName(profile.last_name || '');
              setUserRole(profile.role);
            }
          });
      } else {
        setFirstName('');
        setLastName('');
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

  return (
    <header className="flex items-center justify-between border-b bg-white shadow-sm px-4 py-3 md:px-8 relative">
      <div className="flex items-center gap-x-3">
        <Link href="/" className="flex items-center gap-x-2">
          <Image
            src="/logo.png"
            alt="East LA Chemicals Logo"
            width={63}
            height={45}
            className="rounded"
          />
          <span className="font-semibold text-lg tracking-wide hidden md:block">
            East LA Chemicals
          </span>
        </Link>
      </div>

      {/* Hamburger menu for mobile */}
      <div className="md:hidden flex items-center z-20">
        <Button variant="ghost" onClick={toggleMenu} className="focus:outline-none">
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleMenu} // Close menu when clicking overlay
        ></div>
      )}

      <nav className={`fixed md:relative top-0 md:top-auto bottom-0 left-0 h-full md:h-auto w-64 md:w-auto bg-white shadow-md md:shadow-none p-4 md:p-0 transition-transform duration-300 ease-in-out transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex flex-1 justify-center z-20`}>
        <ul className="flex flex-col md:flex-row gap-4 md:gap-6 text-base font-medium md:items-center items-start w-full md:w-auto">
          <li>
            <Link href="/" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Home</Link>
          </li>
          <li>
            <Link href="/products" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Products</Link>
          </li>
          <li>
            <Link href="/ordering" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Ordering</Link>
          </li>
          <li>
            <Link href="/contact" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Contact us</Link>
          </li>
          <li>
            <Link href="/reviews" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Reviews</Link>
          </li>
          <li>
            <Link href="/order-history" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Order History</Link>
          </li>
          <li>
            <Link href="/order-status" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Order status</Link>
          </li>
          {(session && userRole === "admin") || (session && userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE) || (session && userRole === PURCHASE_QUOTATION_MANAGER_ROLE) || (session && userRole === RAW_MATERIAL_MANAGER_ROLE) || (session && userRole === PURCHASING_MANAGER_ROLE) ? (
            <li className="relative">
              <Button variant="ghost" onClick={toggleAdminDropdown} className="focus:outline-none">
                Dashboard
              </Button>
              {showAdminDropdown && (
                <ul className="absolute bg-white shadow-lg rounded-md mt-2 py-1 w-48 z-30">
                  {session && userRole === "admin" && (
                    <li>
                      <Link href="/dashboard/users" className="block px-4 py-2 hover:bg-gray-100" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>User Dashboard</Link>
                    </li>
                  )}
                  {session && userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE && (
                    <li>
                      <Link href="/dashboard/supplier-management" className="block px-4 py-2 hover:bg-gray-100" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Supplier Management</Link>
                    </li>
                  )}
                  {session && userRole === PURCHASE_QUOTATION_MANAGER_ROLE && (
                    <li>
                      <Link href="/dashboard/purchase-quotation-manager" className="block px-4 py-2 hover:bg-gray-100" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Purchase Quotation Manager</Link>
                    </li>
                  )}
                  {session && userRole === RAW_MATERIAL_MANAGER_ROLE && (
                    <li>
                      <Link href="/dashboard/raw-material-manager" className="block px-4 py-2 hover:bg-gray-100" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Raw Material Manager</Link>
                    </li>
                  )}
                  {session && userRole === PURCHASING_MANAGER_ROLE && (
                    <li>
                      <Link href="/dashboard/po-manager" className="block px-4 py-2 hover:bg-gray-100" onClick={() => { setIsMenuOpen(false); closeAdminDropdown(); }}>Purchase Order Manager</Link>
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
              <span className="text-sm">Hello {firstName} {lastName}</span>
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
