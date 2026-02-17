export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  unit: string;
  unitsPerCase: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  availability: string;
  stockQuantity: number;

  // Backorder / pre-order support
  allowBackorder?: boolean;           // whether customer can order beyond current stock
  backorderLeadTimeDays?: number;     // estimated lead time for backordered units
  backorderLimit?: number;            // optional product-level cap for total quantity allowed

  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  subCategories?: Category[];
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate?: number;
  unit: string;
  unitsPerCase: number;
  imageUrl?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  availability: string;
}
