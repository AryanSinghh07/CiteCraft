import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Two-column layout shared by the sign in, sign up and password pages. */
const AuthLayout = ({ title, description, children }: AuthLayoutProps) => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow pt-24">
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="max-w-md mx-auto md:mx-0 space-y-6 animate-fade-in">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="order-1 md:order-2">{children}</div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default AuthLayout;
