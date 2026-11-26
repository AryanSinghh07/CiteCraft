import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Camera, Globe, GraduationCap, Loader2, Save, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile';
import PublicProfileSettings from '@/features/profile/components/PublicProfileSettings';
import { MAX_AVATAR_BYTES } from '@/services';
import type { Profile as ProfileType } from '@/types';

type FormState = Omit<ProfileType, 'id' | 'researchInterests'> & { researchInterests: string[] };

const toFormState = (p: ProfileType | null): FormState => ({
  name: p?.name ?? '',
  email: p?.email ?? '',
  position: p?.position ?? '',
  department: p?.department ?? '',
  affiliation: p?.affiliation ?? '',
  photoUrl: p?.photoUrl ?? '',
  bio: p?.bio ?? '',
  researchInterests: p?.researchInterests ?? [],
  orcid: p?.orcid ?? '',
  googleScholar: p?.googleScholar ?? '',
  website: p?.website ?? '',
});

const Profile = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [formData, setFormData] = useState<FormState>(() => toFormState(profile));
  const [interest, setInterest] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(toFormState(profile));
  }, [profile]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Not an image', description: 'Please choose a PNG, JPG, WebP or GIF.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Image too large', description: 'Profile photos must be 2 MB or smaller.', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
  };

  const addInterest = () => {
    const value = interest.trim();
    if (value && !formData.researchInterests.some(i => i.toLowerCase() === value.toLowerCase())) {
      setFormData(prev => ({ ...prev, researchInterests: [...prev.researchInterests, value] }));
    }
    setInterest('');
  };

  const removeInterest = (value: string) =>
    setFormData(prev => ({ ...prev, researchInterests: prev.researchInterests.filter(i => i !== value) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Email is the sign-in identity, so it isn't edited here.
    const { email: _email, ...patch } = formData;
    try {
      await updateProfile.mutateAsync({ patch, avatarFile });
      setAvatarFile(null);
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
    } catch (error) {
      toast({
        title: 'Could not save profile',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const displayPhoto = avatarPreview ?? profile?.photoUrl;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your personal and academic information</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="glass-card md:sticky md:top-24">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative mb-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Change profile photo"
                  >
                    {displayPhoto ? (
                      <img src={displayPhoto} alt={profile?.name} className="w-32 h-32 rounded-full object-cover" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon size={48} className="text-muted-foreground" />
                      </div>
                    )}
                    <span className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6" />
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  {avatarFile && (
                    <p className="text-xs text-muted-foreground mb-2">New photo selected — save to apply.</p>
                  )}

                  <h2 className="text-xl font-semibold">{profile?.name || 'Your name'}</h2>
                  <p className="text-muted-foreground">{profile?.position}</p>
                  <p className="text-muted-foreground">{profile?.affiliation}</p>

                  <Separator className="my-4" />

                  <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium truncate">{profile?.email}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium truncate">{profile?.department || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
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
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" value={formData.email} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          placeholder="e.g. Associate Professor"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          placeholder="e.g. Computer Science"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="affiliation">Affiliation</Label>
                        <Input
                          id="affiliation"
                          name="affiliation"
                          value={formData.affiliation}
                          onChange={handleChange}
                          placeholder="e.g. University of Science & Technology"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          maxLength={2000}
                          value={formData.bio}
                          onChange={handleChange}
                          placeholder="A short description of your research"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="interest">Research interests</Label>
                        <div className="flex gap-2">
                          <Input
                            id="interest"
                            value={interest}
                            onChange={e => setInterest(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addInterest();
                              }
                            }}
                            placeholder="Add an interest and press Enter"
                          />
                          <Button type="button" variant="outline" onClick={addInterest}>
                            Add
                          </Button>
                        </div>
                        {formData.researchInterests.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {formData.researchInterests.map(item => (
                              <span
                                key={item}
                                className="bg-secondary text-secondary-foreground text-xs pl-2 pr-1 py-1 rounded-full flex items-center gap-1"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => removeInterest(item)}
                                  aria-label={`Remove ${item}`}
                                  className="opacity-70 hover:opacity-100"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium">Academic links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="orcid">ORCID iD</Label>
                          <Input
                            id="orcid"
                            name="orcid"
                            value={formData.orcid}
                            onChange={handleChange}
                            placeholder="0000-0000-0000-0000"
                            pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]"
                            title="Format: 0000-0000-0000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="googleScholar" className="flex items-center gap-1">
                            <GraduationCap size={14} /> Google Scholar URL
                          </Label>
                          <Input
                            id="googleScholar"
                            name="googleScholar"
                            type="url"
                            value={formData.googleScholar}
                            onChange={handleChange}
                            placeholder="https://scholar.google.com/citations?user=…"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="website" className="flex items-center gap-1">
                            <Globe size={14} /> Personal website
                          </Label>
                          <Input
                            id="website"
                            name="website"
                            type="url"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={updateProfile.isPending} className="button-hover">
                        {updateProfile.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {profile && <PublicProfileSettings profile={profile} />}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
