export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: "admin" | "supplier_management_manager" | "customer" | "raw_material_manager" | "purchase_quotation_manager" | "purchasing_manager" | "warehouse_staff" | "sales_quotation_manager" | "finance_manager" | "order_manager" | "production_manager" | "sales_staff" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: "admin" | "supplier_management_manager" | "customer" | "raw_material_manager" | "purchase_quotation_manager" | "purchasing_manager" | "warehouse_staff" | "sales_quotation_manager" | "finance_manager" | "order_manager" | "production_manager" | "sales_staff" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: "admin" | "supplier_management_manager" | "customer" | "raw_material_manager" | "purchase_quotation_manager" | "purchasing_manager" | "warehouse_staff" | "sales_quotation_manager" | "finance_manager" | "order_manager" | "production_manager" | "sales_staff" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchaseorder: {
        Row: {
          id: string;
          purchaseQuotationId: string | null;
          supplierId: string | null;
          orderDate: string;
          deliveryDate: string;
          poReferenceNumber: string;
          totalAmount: number | null;
          status: string; // Assuming 'Pending', 'Approved', etc.
          createdat: string; // Using lowercase as per SQL query result
          updatedat: string; // Using lowercase as per SQL query result
        };
        Insert: {
          id?: string;
          purchaseQuotationId?: string | null;
          supplierId?: string | null;
          orderDate?: string;
          deliveryDate?: string;
          poReferenceNumber?: string;
          totalAmount?: number | null;
          status?: string;
          createdat?: string;
          updatedat?: string;
        };
        Update: {
          id?: string;
          purchaseQuotationId?: string | null;
          supplierId?: string | null;
          orderDate?: string;
          deliveryDate?: string;
          poReferenceNumber?: string;
          totalAmount?: number | null;
          status?: string;
          createdat?: string;
          updatedat?: string;
        };
      };
      supplier_management_items: {
        Row: {
          id: string;
          name: string;
          supplier_shop: string | null;
          // Add other supplier_management_items columns if needed by other parts of the app
        };
        Insert: {
          id?: string;
          name: string;
          supplier_shop?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          supplier_shop?: string | null;
        };
      };
      purchaseordermaterial: {
        Row: {
          id: string;
          purchaseorderid: string; // Lowercase as per database
          rawmaterialid: string; // Lowercase as per database
          quantity: number;
          unitprice: number; // Lowercase as per database
          createdat: string; // Lowercase
          updatedat: string; // Lowercase
        };
        Insert: {
          id?: string;
          purchaseorderid: string;
          rawmaterialid: string;
          quantity: number;
          unitprice?: number;
          createdat?: string;
          updatedat?: string;
        };
        Update: {
          id?: string;
          purchaseorderid?: string;
          rawmaterialid?: string;
          quantity?: number;
          unitprice?: number;
          createdat?: string;
          updatedat?: string;
        };
      };
      RawMaterial: { // Assumed camelCase as per previous Prisma schema
        Row: {
          id: string;
          name: string;
          // Add other RawMaterial columns if needed by other parts of the app
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      // Other tables...
      PurchaseQuotation: { // Adding PurchaseQuotation type for completeness as it's also used
        Row: {
          id: string;
          supplierId: string | null;
          quotedPrice: number;
          validityDate: string;
          isOrder: boolean;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          supplierId?: string | null;
          quotedPrice: number;
          validityDate: string;
          isOrder?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          supplierId?: string | null;
          quotedPrice?: number;
          validityDate?: string;
          isOrder?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      purchasequotationmaterial: {
        Row: {
          id: string;
          purchasequotationid: string;
          rawmaterialid: string;
          quantity: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          purchasequotationid: string;
          rawmaterialid: string;
          quantity: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          purchasequotationid?: string;
          rawmaterialid?: string;
          quantity?: number;
          createdAt?: string;
          updatedAt?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 
