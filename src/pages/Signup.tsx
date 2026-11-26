import AuthLayout from '@/components/layout/AuthLayout';
import SignupForm from '@/features/auth/components/SignupForm';

const Signup = () => (
  <AuthLayout
    title="Join CiteCraft"
    description="Create a free account to keep all your publications, documents and research metrics in one place."
  >
    <SignupForm />
  </AuthLayout>
);

export default Signup;
