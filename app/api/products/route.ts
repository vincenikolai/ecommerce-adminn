import { NextResponse } from "next/server";

const products = [
  {
    id: "calamansi-dishwashing",
    name: "Calamansi Liquid Dishwashing",
    description:
      "Natural calamansi-scented dishwashing liquid that effectively removes grease and food residues while leaving a fresh citrus fragrance.",
    price: 100,
    imageUrl: "/cleaning products.jpg",
    category: "Dishwashing",
    stock: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lemon-dishwashing",
    name: "Lemon Liquid Dishwashing",
    description:
      "Powerful lemon-scented dishwashing solution that cuts through tough grease and leaves dishes sparkling clean with a refreshing lemon scent.",
    price: 100,
    imageUrl: "/cleaning products.jpg",
    category: "Dishwashing",
    stock: 45,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lavender-handsoap",
    name: "Lavender Liquid Handsoap",
    description:
      "Gentle lavender-scented hand soap that effectively cleans hands while providing a calming and soothing lavender fragrance.",
    price: 120,
    imageUrl: "/cleaning products.jpg",
    category: "Handsoap",
    stock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "laundry-detergent",
    name: "Liquid Laundry Detergent",
    description:
      "Concentrated liquid laundry detergent that removes tough stains and leaves clothes fresh and clean with a pleasant fragrance.",
    price: 180,
    imageUrl: "/laundry.png",
    category: "Laundry",
    stock: 25,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "gpd-102",
    name: "GPD 102",
    description:
      "Professional-grade cleaning solution designed for industrial and commercial use. Effective against various types of dirt and grime.",
    price: 250,
    imageUrl: "/cleaning products.jpg",
    category: "Industrial Cleaner",
    stock: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "quadro-cleaner",
    name: "Quadro All-Purpose Cleaner",
    description:
      "Versatile all-purpose cleaner that can be used on various surfaces including floors, walls, and countertops. Safe and effective.",
    price: 150,
    imageUrl: "/cleaning products.jpg",
    category: "All-Purpose",
    stock: 35,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "stratus-disinfectant",
    name: "Stratus Disinfectant Fogging Solution",
    description:
      "Professional disinfectant solution designed for fogging applications. Kills bacteria and viruses effectively in large spaces.",
    price: 300,
    imageUrl: "/cleaning products.jpg",
    category: "Disinfectant",
    stock: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fabric-conditioner",
    name: "Fabric Conditioner",
    description:
      "Premium fabric conditioner that softens clothes, reduces static, and leaves a long-lasting fresh fragrance on your laundry.",
    price: 130,
    imageUrl: "/laundry.png",
    category: "Laundry Care",
    stock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "powder-detergent",
    name: "Laundry Powder Detergent",
    description:
      "Concentrated powder detergent that provides excellent cleaning power for all types of fabrics. Economical and effective.",
    price: 160,
    imageUrl: "/laundry.png",
    category: "Laundry",
    stock: 28,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    let filteredProducts = [...products];

    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter(
        (product) => product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort products
    filteredProducts.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "price") {
        valA = a.price;
        valB = b.price;
      } else if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA === null && valB === null) return 0;
      if (valA === null) return sortOrder === "asc" ? 1 : -1;
      if (valB === null) return sortOrder === "asc" ? -1 : 1;

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return NextResponse.json(filteredProducts);
  } catch (error: unknown) {
    console.error("Unexpected error in products API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
