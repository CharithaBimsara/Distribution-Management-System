export interface Customer {
  id: string;
  userId: string;
  shopName: string;
  businessRegistrationNumber?: string;
  regionId?: string;
  regionName?: string;
  subRegionId?: string;
  subRegionName?: string;
  assignedRepId?: string;
  assignedRepName?: string;
  assignedCoordinatorId?: string;
  assignedCoordinatorName?: string;
  approvalStatus?: string;
  approvalRejectionReason?: string;
  email?: string;
  phoneNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  lastOrderDate?: string;
  totalOrders?: number;
  totalOrderValue?: number;
}

export interface CustomerSummary {
  customer: Customer;
  totalPurchases: number;
  totalOrders: number;
  lastOrderDate?: string;
  frequentProducts: string[];
  registrationRequest?: RegistrationSummary;
}

export interface RegistrationSummary {
  customerType: string;
  customerName: string;
  registeredAddress?: string;
  incorporateDate?: string;
  businessName?: string;
  businessLocation?: string;
  bankBranch?: string;
  province?: string;
  town?: string;
  proprietorName?: string;
  proprietorTp?: string;
  managerName?: string;
  managerTp?: string;
  businessRegDocPath?: string;
  businessAddressDocPath?: string;
  vatDocPath?: string;
}

export interface CustomerFilterOptions {
  assignedReps: RepOption[];
  coordinators: CoordinatorOption[];
  regions: RegionOption[];
  subRegions: SubRegionOption[];
}

export interface RepOption {
  id: string;
  name: string;
}

export interface CoordinatorOption {
  id: string;
  name: string;
}

export interface RegionOption {
  id: string;
  name: string;
}

export interface SubRegionOption {
  id: string;
  name: string;
  regionId: string;
}
