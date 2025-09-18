'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React from 'react'; // Import React

import { PurchaseInvoiceForm } from "./components/purchase-invoice-form";

import { PurchaseInvoice } from '@/types/purchase-invoice';
import { SupplierManagementItem } from '@/types/supplier-management';
import { PurchaseOrder } from '@/types/purchase-order';
import { ReceivingReport } from '@/types/receiving-report';
import { RawMaterial } from '@/types/raw-material';

const PurchaseInvoicePage = ({
  params: paramsPromise // Rename incoming params to avoid conflict
}: {
  params: Promise<{ purchaseInvoiceId: string }> | { purchaseInvoiceId: string }; // Adjust type to reflect possibility of Promise
}) => {
  const params = React.use(paramsPromise);
  const supabase = createClientComponentClient();

  const [purchaseInvoice, setPurchaseInvoice] = useState<PurchaseInvoice | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseInvoice = async (id: string) => {
    if (id === "new") {
      setPurchaseInvoice(null);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("purchaseinvoice")
        .select(`
          *,
          materials:purchaseinvoicematerial (*,
            rawMaterial:RawMaterial(*)
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      setPurchaseInvoice(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch purchase invoice");
      console.error("Error fetching purchase invoice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from("supplier_management_items").select("*");
      if (error) {
        throw new Error(error.message);
      }
      setSuppliers(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch suppliers");
      console.error("Error fetching suppliers:", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase.from("purchaseorder").select("*");
      if (error) {
        throw new Error(error.message);
      }
      setPurchaseOrders(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch purchase orders");
      console.error("Error fetching purchase orders:", err);
    }
  };

  const fetchReceivingReports = async () => {
    try {
      const { data, error } = await supabase.from("receivingreport").select("*");
      if (error) {
        throw new Error(error.message);
      }
      setReceivingReports(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch receiving reports");
      console.error("Error fetching receiving reports:", err);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase.from("RawMaterial").select("*");
      if (error) {
        throw new Error(error.message);
      }
      setRawMaterials(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch raw materials");
      console.error("Error fetching raw materials:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        fetchPurchaseInvoice(params.purchaseInvoiceId),
        fetchSuppliers(),
        fetchPurchaseOrders(),
        fetchReceivingReports(),
        fetchRawMaterials(),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [params.purchaseInvoiceId]);

  if (isLoading) {
    return <div className="flex-col"><div className="flex-1 space-y-4 p-8 pt-6">Loading...</div></div>;
  }

  if (error) {
    return <div className="flex-col"><div className="flex-1 space-y-4 p-8 pt-6 text-red-500">Error: {error}</div></div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseInvoiceForm 
          initialData={purchaseInvoice}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          receivingReports={receivingReports}
          rawMaterials={rawMaterials}
        />
      </div>
    </div>
  );
};

export default PurchaseInvoicePage;
