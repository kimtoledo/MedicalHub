export interface RxTemplateProps {
  clinicName: string;
  clinicAddress: string | null;
  clinicPhone: string | null;
  /** Snapshotted clinic logo URL (from the Rx record). */
  clinicLogoUrl: string | null;
  patientName: string;
  patientNumber: string;
  dentistName: string;
  prcLicenseNumber: string | null;
  /** Base64 data-URL of the dentist's signature image. */
  signatureUrl: string | null;
  issuedAt: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    specialInstructions: string | null;
    sortOrder: number;
  }>;
  amendedFromId: string | null;
}
