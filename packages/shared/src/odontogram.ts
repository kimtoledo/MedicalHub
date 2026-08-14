// ---------------------------------------------------------------------------
// Odontogram tooth vocabulary
// FDI (ISO 3950) notation. Permanent teeth: 11-18/21-28/31-38/41-48.
// Deciduous (primary) teeth: 51-55/61-65/71-75/81-85.
// ---------------------------------------------------------------------------
export const PERMANENT_TEETH_UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'] as const;
export const PERMANENT_TEETH_LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'] as const;

export const DECIDUOUS_TEETH_UPPER = ['55','54','53','52','51','61','62','63','64','65'] as const;
export const DECIDUOUS_TEETH_LOWER = ['85','84','83','82','81','71','72','73','74','75'] as const;

export const ALL_TOOTH_NUMBERS = [
  ...PERMANENT_TEETH_UPPER,
  ...PERMANENT_TEETH_LOWER,
  ...DECIDUOUS_TEETH_UPPER,
  ...DECIDUOUS_TEETH_LOWER,
] as const;
export type ToothNumber = (typeof ALL_TOOTH_NUMBERS)[number];

export const TOOTH_SURFACES = ['M','D','O','B','L','I','F'] as const;
export type ToothSurface = (typeof TOOTH_SURFACES)[number];

export const TOOTH_CONDITIONS = ['sound','caries','missing','impacted','crown','bridge_pontic','root_fragment','implant','fracture','mobility'] as const;
export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

export const TOOTH_PROCEDURES = ['extraction','composite_filling','amalgam_filling','root_canal','crown_placement','scaling','bleaching'] as const;
export type ToothProcedure = (typeof TOOTH_PROCEDURES)[number];
