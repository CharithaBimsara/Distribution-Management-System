export const QUOTATION_STATUSES = [
  'Draft',
  'Submitted',
  'UnderReview',
  'Approved',
  'Rejected',
  'ConvertedToOrder',
  'Expired'
] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  shopName?: string;
  repId?: string;
  repName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  status: QuotationStatus;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  rejectionReason?: string;
  validUntil?: string;
  convertedOrderId?: string;
  items: QuotationItem[];
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  productSKU?: string;
  quantity: number;
  unitPrice: number;
  expectedPrice?: number;
  discountPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface CreateQuotationRequest {
  customerId: string;
  notes?: string;
  validUntil?: string;
  items: CreateQuotationItemRequest[];
}

export interface CreateQuotationItemRequest {
  productId: string;
  quantity: number;
  expectedPrice?: number;
  discountPercent: number;
}

export interface ApproveQuotationRequest {
  notes?: string;
}

export interface RejectQuotationRequest {
  reason: string;
}

export interface ConvertQuotationToOrderRequest {
  deliveryAddress?: string;
  deliveryNotes?: string;
  requiredDeliveryDate?: string;
}
