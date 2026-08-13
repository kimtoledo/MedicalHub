import VerificationReviewClient from './VerificationReviewClient';
export default function VerificationReviewPage({ params }: { params: { submissionId: string } }) { return <VerificationReviewClient submissionId={params.submissionId} />; }
