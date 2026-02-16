export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  repId?: string;
  repName?: string;
  orderDate: string;
  requiredDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  deliveryAddress?: string;
  deliveryNotes?: string;
  rating?: number;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSKU?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface CreateOrderRequest {
  customerId: string;
  requiredDeliveryDate?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  discountPercent?: number;
}

export interface OrderFilterRequest {
  status?: string;
  customerId?: string;
  repId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateOrderStatusRequest {
  status: string;
  reason?: string;
}

export interface RateOrderRequest {
  rating: number;
  comment?: string;
}
