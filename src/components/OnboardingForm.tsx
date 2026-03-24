import * as React from 'react';
import { db, auth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Branch, Category, BRANCHES, CATEGORIES, GlobalSettings, YEAR_OPTIONS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { CheckCircle2, ChevronRight, ChevronLeft, GraduationCap, User, BookOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '@/lib/firestore';
import { toast } from 'sonner';
import { onSnapshot } from 'firebase/firestore';

interface OnboardingFormProps {
  settings: GlobalSettings;
  onComplete: () => void;
}

export function OnboardingForm({ settings, onComplete }: OnboardingFormProps) {
  const [user] = useAuthState(auth);
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    displayName: user?.displayName || '',
    branch: 'Information Technology' as Branch,
    category: settings.categories[0] as Category || 'Open',
    cgpa: '',
    year: YEAR_OPTIONS[0]
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Create public profile
      const profilePath = `profiles/${user.uid}`;
      const cgpaValue = parseFloat(formData.cgpa);
      if (isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
        throw new Error('Please enter a valid CGPA between 0 and 10.');
      }

      try {
        await setDoc(doc(db, 'profiles', user.uid), {
          uid: user.uid,
          displayName: formData.displayName,
          branch: formData.branch,
          category: formData.category,
          year: formData.year,
          cgpa: cgpaValue,
          role: 'student',
          createdAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, profilePath);
      }

      // Create private data
      const privatePath = `profiles/${user.uid}/private/data`;
      try {
        await setDoc(doc(db, 'profiles', user.uid, 'private', 'data'), {
          email: user.email
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, privatePath);
      }

      onComplete();
    } catch (error: any) {
      console.error('Onboarding failed', error);
      toast.error(error.message || 'Onboarding failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Identity', icon: User, description: 'Verify your name and year.' },
    { id: 2, title: 'Academic', icon: BookOpen, description: 'Select your branch.' },
    { id: 3, title: 'Category', icon: Star, description: 'Specify your category.' },
    { id: 4, title: 'Merit', icon: GraduationCap, description: 'Enter your current CGPA.' }
  ];

  return (
    <div className="flex min-h-[600px] items-center justify-center p-4">
      <Card className="w-full max-w-lg overflow-hidden border-zinc-800 bg-zinc-950/50 shadow-2xl">
        <div className="flex h-2 w-full bg-zinc-900">
          <motion.div 
            className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <CardHeader className="space-y-4">
          <div className="flex justify-between">
            {steps.map((s) => (
              <div 
                key={s.id} 
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  step >= s.id ? "border-red-600 bg-red-600/10 text-red-500" : "border-zinc-800 text-zinc-600"
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-zinc-100">
              {steps[step - 1].title}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {steps[step - 1].description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Full Name</label>
                    <Input 
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Current Year</label>
                    <Select 
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    >
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Engineering Branch</label>
                  <Select 
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value as Branch })}
                  >
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Category</label>
                  <Select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                  >
                    {settings?.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <p className="text-xs text-zinc-500 mt-2">
                    Note: Seat allocation follows the merit-based distribution per branch.
                  </p>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Current CGPA</label>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.cgpa}
                      onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                      placeholder="e.g. 8.50"
                    />
                  </div>
                  <div className="rounded-lg bg-red-900/20 p-4 border border-red-800/50">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-red-400 shrink-0" />
                      <p className="text-xs text-red-200 leading-relaxed">
                        Privacy Guarantee: Your CGPA is stored securely and will only be visible to you and administrators. Other students will only see your Rank.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-zinc-900 pt-6">
          <Button 
            variant="ghost" 
            onClick={prevStep} 
            disabled={step === 1 || isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={nextStep} 
              disabled={!formData.displayName && step === 1}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.cgpa || isSubmitting}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Finalizing..." : "Join the Race"}
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
