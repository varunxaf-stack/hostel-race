import { auth, googleProvider } from '@/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { LogIn, LogOut, User, Trophy } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuthState } from 'react-firebase-hooks/auth';

export function Navbar() {
  const [user] = useAuthState(auth);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/20">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-zinc-100">
            HOSTEL<span className="text-red-500">RACE</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-medium text-zinc-100">{user.displayName}</span>
                <span className="text-xs text-zinc-500">{user.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleLogin} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
