import ConsultForm from "./ConsultForm";

/**
 * Public photo consult submission page.
 * Accessible to anyone with the link — no login required.
 *
 * URL: /consult/:clinicId
 * Clinics can share this link with patients via SMS, email, or their website.
 */
export const dynamic = "force-dynamic";

export default async function ConsultPage(
  props: {
    params: Promise<{ clinicId: string }>;
  }
) {
  const params = await props.params;
  return <ConsultForm clinicId={params.clinicId} />;
}
