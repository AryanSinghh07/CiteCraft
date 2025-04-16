
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoginForm from '@/components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is already logged in
    const userData = localStorage.getItem('academiaUserData');
    if (userData) {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow pt-24">
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="max-w-md mx-auto md:mx-0 space-y-6 animate-fade-in">
                  <h1 className="text-3xl font-bold">Sign in to CiteCraft</h1>
                  <p className="text-muted-foreground">
                    Enter your credentials to access your publications dashboard and summary generator.
                  </p>
                </div>
              </div>
              
              <div className="order-1 md:order-2">
                <LoginForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
