export type HmoPayer = {
  id: string;
  name: string;
  accreditationNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: string;
  createdAt: string;
};
