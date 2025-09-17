'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserRole } from '@/types/user';
import { toast } from 'react-hot-toast';
import axios from 'axios';

import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/ui/loader';
import { PurchaseInvoice } from '@/types/purchase-invoice';
import { PurchaseInvoiceForm } from '@/components/forms/purchase-invoice-form';
import { PurchaseInvoiceList } from '@/components/tables/purchase-invoice-list';
import { PurchaseOrder } from '@/types/purchase-order';
import { RawMaterial } from '@/types/raw-material';
import { ReceivingReport } from '@/types/receiving-report'; // Added import for ReceivingReport

interface PurchaseInvoicePageProps {
  params: { storeId: string };
}

const PurchaseInvoicePage: React.FC<PurchaseInvoicePageProps> = () => {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]); // New state for receiving reports

  const fetchPurchaseInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/purchase-invoices/list');
      setPurchaseInvoices(response.data);
    } catch (error) {
      toast.error("Failed to fetch purchase invoices.");
      console.error("Error fetching purchase invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get('/api/admin/purchase-orders/list');
      const data = response.data.map((po: any) => ({
        ...po,
        materials: po.purchaseordermaterial || [], // Map the nested materials
      }));
      setPurchaseOrders(data);
    } catch (error) {
      toast.error("Failed to fetch purchase orders.");
      console.error("Error fetching purchase orders:", error);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await axios.get('/api/admin/raw-materials/list');
      setRawMaterials(response.data);
    } catch (error) {
      toast.error("Failed to fetch raw materials.");
      console.error("Error fetching raw materials:", error);
    }
  };

  const fetchReceivingReports = async () => {
    try {
      const response = await axios.get('/api/admin/receiving-reports/list');
      const data = response.data.map((report: any) => ({
        ...report,
        purchaseOrder: report.purchaseorder || undefined,
        items: report.receivingreportitem || [],
      }));
      setReceivingReports(data);
    } catch (error) {
      toast.error("Failed to fetch receiving reports.");
      console.error("Error fetching receiving reports:", error);
    }
  };

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/sign-in');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to fetch user role.');
        router.push('/');
        return;
      }

      setUserRole(profile.role as UserRole);

      if (profile.role !== 'finance_manager' && profile.role !== 'admin') {
        toast.error('You do not have permission to view this page.');
        router.push('/dashboard');
      } else {
        await fetchPurchaseInvoices();
        await fetchPurchaseOrders();
        await fetchRawMaterials();
        await fetchReceivingReports(); // Call the new fetch function
      }
      setLoading(false);
    };

    checkUserRoleAndFetchData();
  }, [router, supabase]);

  const handleNewInvoice = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const handleEditInvoice = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  if (loading) {
    return <Loader />;
  }

  if (userRole !== 'finance_manager' && userRole !== 'admin') {
    return null; 
  }

  return (
    <div className="flex-col">
      <div className="flex-1 p-8 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <Heading title="Purchase Invoices" description="Manage your purchase invoices" />
          <Button onClick={handleNewInvoice}>Add New</Button>
        </div>
        <Separator />
        {isFormOpen ? (
          <PurchaseInvoiceForm 
            initialData={selectedInvoice}
            purchaseOrders={purchaseOrders} // Pass purchase orders
            rawMaterials={rawMaterials}   // Pass raw materials
            receivingReports={receivingReports} // Pass receiving reports
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedInvoice(null);
              fetchPurchaseInvoices();
            }}
          />
        ) : (
          <PurchaseInvoiceList data={purchaseInvoices} onRefresh={fetchPurchaseInvoices} />
        )}
      </div>
    </div>
  );
};

export default PurchaseInvoicePage;
