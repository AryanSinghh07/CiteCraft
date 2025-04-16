
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User } from '@/utils/types';
import { useToast } from '@/components/ui/use-toast';
import { Save, User as UserIcon } from 'lucide-react';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('academiaUserData');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      setUser(parsedUser);
      setFormData(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (user && formData) {
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('academiaUserData', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  if (!user || !formData) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your personal and academic information</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="glass-card">
                <CardContent className="pt-6 flex flex-col items-center">
                  <div className="mb-4">
                    {user.photoUrl ? (
                      <img 
                        src={user.photoUrl} 
                        alt={user.name} 
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon size={48} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <p className="text-muted-foreground">{user.position}</p>
                  <p className="text-muted-foreground">{user.affiliation}</p>
                  
                  <Separator className="my-4" />
                  
                  <div className="w-full space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{user.department}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>Update your profile information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          name="position"
                          value={formData.position || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          name="department"
                          value={formData.department || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="affiliation">Affiliation</Label>
                        <Input
                          id="affiliation"
                          name="affiliation"
                          value={formData.affiliation || ''}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="photoUrl">Profile Photo URL</Label>
                        <Input
                          id="photoUrl"
                          name="photoUrl"
                          type="url"
                          value={formData.photoUrl || ''}
                          onChange={handleChange}
                          placeholder="https://example.com/photo.jpg"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isLoading} className="button-hover">
                        {isLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Save size={16} className="mr-2" />
                            <span>Save Changes</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
