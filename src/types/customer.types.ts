export interface Customer {
  id: string;
  userId: string;
  shopName: string;
  businessRegistrationNumber?: string;
  creditLimit: number;
  currentBalance: number;
  paymentTermsDays: number;
  customerSegment?: string;
  assignedRepId?: string;
  assignedRepName?: string;
  isBlacklisted: boolean;
  email?: string;
  phoneNumber?: string;
  // Address fields (flat from backend)
  street?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  lastOrderDate?: string;
  totalOrders?: number;
}

export interface CustomerSummary {
  customer: Customer;
  totalPurchases: number;
  totalOrders: number;
  outstandingBalance: number;
  lastOrderDate?: string;
  frequentProducts: string[];
}

export interface CustomerFilterOptions {
  assignedReps: RepOption[];
  customerSegments: string[];
}

export interface RepOption {
  id: string;
  name: string;
}
