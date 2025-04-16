
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { sampleUser } from '@/utils/publicationData';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate input
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Simulating login request
    setTimeout(() => {
      if (email === 'aryan@example.com' && password === 'aryan') {
        // Store user data in localStorage
        localStorage.setItem('academiaUserData', JSON.stringify(sampleUser));
        
        toast({
          title: "Success",
          description: "You have successfully logged in",
        });
        
        navigate('/dashboard');
      } else {
        toast({
          title: "Error",
          description: "Invalid email or password. Try demo@example.com / password",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-scale-in glass-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="bg-background/50"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline focus:outline-none"
                onClick={() => toast({
                  title: "Password Reset",
                  description: "This is a demo. Use email: demo@example.com and password: password"
                })}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-background/50 pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-4 button-hover"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Sign In</span>
                <ArrowRight size={16} />
              </div>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button 
            className="text-primary hover:underline focus:outline-none" 
            onClick={() => toast({
              title: "Registration",
              description: "baad me"
            })}
          >
            Sign Up
          </button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
