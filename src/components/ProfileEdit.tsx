import * as React from 'react';
import { db, auth } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Profile, Branch, Category, BRANCHES, CATEGORIES, GlobalSettings, YEAR_OPTIONS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { User, Save, ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firestore';
import { onSnapshot } from 'firebase/firestore';

interface ProfileEditProps {
  uid: string;
  onClose: () => void;
  isAdmin: boolean;
}

export function ProfileEdit({ uid, onClose, isAdmin }: ProfileEditProps) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<GlobalSettings | null>(null);

  React.useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as Profile);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `profiles/${uid}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'profiles', uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Profile updated successfully!');
      onClose();
    } catch (e: any) {
      toast.error('Failed to update profile: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div></div>;
  if (!profile) return <div className="text-center py-12 text-zinc-500">Profile not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      className="max-w-2xl mx-auto py-8"
    >
      <Button variant="ghost" onClick={onClose} className="mb-6 gap-2 text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to Leaderboard
      </Button>

      <Card className="border-zinc-800 bg-zinc-950/50 shadow-2xl shadow-red-900/5">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/10 text-red-500">
              <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-zinc-100">Edit Profile</CardTitle>
              <CardDescription>Update your personal and academic information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Full Name</Label>
              <Input 
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="border-zinc-800 bg-zinc-900/50 focus:border-red-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Current Year</Label>
              <Select 
                value={profile.year}
                onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                className="border-zinc-800 bg-zinc-900/50 focus:border-red-500/50"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Branch</Label>
              <Select 
                value={profile.branch}
                onChange={(e) => setProfile({ ...profile, branch: e.target.value as Branch })}
                className="border-zinc-800 bg-zinc-900/50 focus:border-red-500/50"
              >
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Category</Label>
              <Select 
                value={profile.category}
                onChange={(e) => setProfile({ ...profile, category: e.target.value as Category })}
                className="border-zinc-800 bg-zinc-900/50 focus:border-red-500/50"
              >
                {settings?.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">CGPA</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={profile.cgpa}
                onChange={(e) => setProfile({ ...profile, cgpa: parseFloat(e.target.value) || 0 })}
                className="border-zinc-800 bg-zinc-900/50 font-mono focus:border-red-500/50"
              />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label className="text-red-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Role (Admin Only)
                </Label>
                <Select 
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value as any })}
                  className="border-red-900/30 bg-red-950/10 text-red-400 focus:border-red-500"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t border-zinc-900 pt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Profile"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
