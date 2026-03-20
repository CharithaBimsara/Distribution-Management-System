// valid status values are kept in sync with the backend enum names
export const ORDER_STATUSES = [
  'Pending',
  'Approved',
  'Processing',
  'Dispatched',
  'Delivered',
  'Completed',
  'Cancelled',
  'OnHold',
  'Rejected',
  'PartiallyDelivered'
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

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
  status: OrderStatus;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  deliveryAddress?: string;
  deliveryNotes?: string;
  rating?: number;
  isFromApprovedQuotation?: boolean;
  sourceQuotationNumber?: string;
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
  mrp?: number;
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
  status?: OrderStatus;
  customerId?: string;
  repId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  reason?: string;
}

export interface RateOrderRequest {
  rating: number;
  comment?: string;
}
