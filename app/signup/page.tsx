import { SignupForm } from "@/components/auth/SignupForm";

// Reads email/fullName search params so the "Create an account?" prompt
// on a guest order's /checkout/success page can prefill this form
// (CreateAccountPrompt.tsx). Visiting /signup directly, with no params,
// behaves exactly as before.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; fullName?: string }>;
}) {
  const { email, fullName } = await searchParams;
  return <SignupForm defaultEmail={email} defaultFullName={fullName} />;
}
