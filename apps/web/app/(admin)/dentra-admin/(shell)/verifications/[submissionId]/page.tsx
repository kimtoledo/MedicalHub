import VerificationReviewClient from './VerificationReviewClient';
export default async function VerificationReviewPage(props: { params: Promise<{ submissionId: string }> }) {
  const params = await props.params;
  return <VerificationReviewClient submissionId={params.submissionId} />;
}
