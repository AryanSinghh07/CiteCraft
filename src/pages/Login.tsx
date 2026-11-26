import AuthLayout from '@/components/layout/AuthLayout';
import LoginForm from '@/features/auth/components/LoginForm';

const Login = () => (
  <AuthLayout
    title="Sign in to CiteCraft"
    description="Enter your credentials to access your publications dashboard and summary generator."
  >
    <LoginForm />
  </AuthLayout>
);

export default Login;
