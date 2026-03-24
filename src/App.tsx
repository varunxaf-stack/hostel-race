import * as React from 'react';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navbar } from './components/Navbar';
import { RaceLeaderboard } from './components/RaceLeaderboard';
import { OnboardingForm } from './components/OnboardingForm';
import { Button } from './components/ui/Button';
import { Trophy, Shield, Zap, GraduationCap, ChevronRight, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { googleProvider } from './firebase';
import { Toaster, toast } from 'sonner';
import { Instagram } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { GlobalSettings } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore';

const DEFAULT_SETTINGS: GlobalSettings = {
  seatDistribution: {
    'Open': 10,
    'OBC': 5,
    'EWS': 2,
    'SC': 3,
    'ST': 2,
    'NT': 2,
    'PwD': 1
  },
  categories: ['Open', 'OBC', 'EWS', 'SC', 'ST', 'NT', 'PwD'],
  instaId: 'hostelrace'
};

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = React.useState(false);
  const [settings, setSettings] = React.useState<GlobalSettings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimeoutMessage, setShowTimeoutMessage] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!settings || loading) {
        setShowTimeoutMessage(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [settings, loading]);

  React.useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      } else {
        console.warn('Settings not found, using defaults');
        setSettings(DEFAULT_SETTINGS);
      }
    }, (err) => {
      console.error('Settings fetch error:', err);
      setError('Failed to connect to database. Please check your internet connection.');
      // Use defaults as fallback to allow app to load
      setSettings(DEFAULT_SETTINGS);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (user) {
      setCheckingProfile(true);
      const checkProfile = async () => {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          setHasProfile(profileDoc.exists());
        } catch (error) {
          console.error('Error checking profile:', error);
          toast.error('Failed to load profile. Please refresh.');
        } finally {
          setCheckingProfile(false);
        }
      };
      checkProfile();
    } else {
      setHasProfile(null);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Login failed', error);
      toast.error('Login failed: ' + error.message);
    }
  };

  if (loading || checkingProfile || !settings) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 gap-4">
        {error || showTimeoutMessage ? (
          <div className="text-center p-6 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-md">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-100 mb-2">
              {error ? 'Connection Error' : 'Taking longer than usual'}
            </h2>
            <p className="text-zinc-400 mb-6">
              {error || "We're having trouble connecting to the database. This might be due to a slow connection or a configuration issue."}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
                Retry Connection
              </Button>
              {showTimeoutMessage && !error && (
                <Button variant="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)} className="text-zinc-500">
                  Continue with Defaults
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
            <Trophy className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-red-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {!user ? (
          <Hero onLogin={handleLogin} />
        ) : hasProfile === false ? (
          <OnboardingForm 
            settings={settings}
            onComplete={() => {
              setHasProfile(true);
              toast.success('Profile created! Welcome to the Race.');
            }} 
          />
        ) : (
          <RaceLeaderboard settings={settings} />
        )}
      </main>
      <Toaster position="top-right" theme="dark" />

      <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-red-500" />
            <span className="font-bold tracking-tighter">HOSTELRACE</span>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            © 2026 Hostel Race. Merit-based seat allocation system.
          </p>
          {settings?.instaId && (
            <div className="flex items-center justify-center gap-2 text-zinc-600 hover:text-red-500 transition-colors">
              <Instagram className="h-4 w-4" />
              <a 
                href={`https://instagram.com/${settings.instaId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-medium"
              >
                @{settings.instaId}
              </a>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400">
          <Zap className="h-4 w-4" />
          <span>New: 2026 Session Open</span>
        </div>
        
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
          The Race for <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Merit</span>
        </h1>
        
        <p className="mx-auto max-w-2xl text-lg text-zinc-400 sm:text-xl">
          A high-performance hostel seat allocation system. Secure your spot based on your academic excellence. Private CGPA, public ranking.
        </p>

        <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={onLogin} className="gap-2 text-lg px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95">
            <LogIn className="h-5 w-5" />
            Join the Race
          </Button>
          <Button size="lg" variant="outline" className="gap-2 text-lg px-8 border-red-900/30 text-red-400 hover:bg-red-950/20">
            View Stats
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 pt-24 sm:grid-cols-3 perspective-1000">
          {[
            { icon: Shield, title: "Privacy First", desc: "Your CGPA is encrypted and hidden from public view." },
            { icon: GraduationCap, title: "Merit Based", desc: "Fair allocation using dynamic branch rules." },
            { icon: Trophy, title: "Live Ranking", desc: "Real-time leaderboard updates as students join." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotateY: -30, z: -100 }}
              animate={{ opacity: 1, rotateY: 0, z: 0 }}
              whileHover={{ rotateY: 10, scale: 1.05, z: 50 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", damping: 15 }}
              className="flex flex-col items-center space-y-3 rounded-2xl border border-red-900/20 bg-zinc-900/30 p-6 backdrop-blur-sm preserve-3d"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 text-red-500 shadow-inner">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-zinc-100">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
