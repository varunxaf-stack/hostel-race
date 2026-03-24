import * as React from 'react';
import { db, auth } from '@/firebase';
import { collection, onSnapshot, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { Profile, PrivateData, StudentRecord, Branch, Category, BRANCHES, CATEGORIES, GlobalSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Search, Filter, Shield, Eye, EyeOff, User, Settings as SettingsIcon, Edit3, Instagram, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '@/lib/firestore';
import { toast } from 'sonner';
import { AdminPanel } from './AdminPanel';
import { ProfileEdit } from './ProfileEdit';

export function RaceLeaderboard({ settings }: { settings: GlobalSettings }) {
  const [user] = useAuthState(auth);
  const [students, setStudents] = React.useState<StudentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showCgpa, setShowCgpa] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | 'All'>('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [editingUid, setEditingUid] = React.useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = React.useState<StudentRecord | null>(null);

  // Check if current user is admin
  React.useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const path = `profiles/${user.uid}`;
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (profileDoc.exists() && profileDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else if (user.email === 'varunxaf@gmail.com') {
          setIsAdmin(true);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    };
    checkAdmin();
  }, [user]);

  // Fetch all profiles
  React.useEffect(() => {
    const profilesRef = collection(db, 'profiles');
    const unsubscribe = onSnapshot(profilesRef, (snapshot) => {
      const profileData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as StudentRecord));
      
      // Calculate Rankings and Allocations per branch
      const processedRecords = processAllocations(profileData, settings);
      setStudents(processedRecords);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      toast.error('Failed to load leaderboard. Please check your connection.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [settings]);

  const processAllocations = (records: StudentRecord[], currentSettings: GlobalSettings): StudentRecord[] => {
    const branches = BRANCHES;
    let allProcessed: StudentRecord[] = [];

    branches.forEach(branch => {
      const branchStudents = records
        .filter(s => s.branch === branch)
        .sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));

      // Assign Global Ranks within branch
      branchStudents.forEach((s, index) => {
        s.rank = index + 1;
      });

      // Allocation Logic based on dynamic settings
      const allocatedIds = new Set<string>();
      
      // Iterate through categories in order defined in settings
      currentSettings.categories.forEach(cat => {
        const seatCount = currentSettings.seatDistribution[cat] || 0;
        let allocatedForCat = 0;
        
        branchStudents.forEach(s => {
          if (!allocatedIds.has(s.uid) && s.category === cat && allocatedForCat < seatCount) {
            s.status = 'Allocated';
            allocatedIds.add(s.uid);
            allocatedForCat++;
          }
        });
      });

      // Set remaining as Waiting
      branchStudents.forEach(s => {
        if (!s.status) s.status = 'Waiting';
      });

      allProcessed = [...allProcessed, ...branchStudents];
    });

    return allProcessed;
  };

  const filteredStudents = students.filter(s => {
    const matchesBranch = selectedBranch === 'All' || s.branch === selectedBranch;
    const matchesSearch = (s.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (s.uid?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (showAdmin) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setShowAdmin(false)} className="gap-2 text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
          Back to Leaderboard
        </Button>
        <AdminPanel initialSettings={settings} />
      </div>
    );
  }

  if (editingUid) {
    return (
      <ProfileEdit 
        uid={editingUid} 
        onClose={() => setEditingUid(null)} 
        isAdmin={isAdmin} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {viewingStudent && (
          <StudentDetailCard 
            student={viewingStudent} 
            onClose={() => setViewingStudent(null)} 
          />
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">The Race</h2>
          <p className="text-zinc-400">Merit-based seat allocation leaderboard.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowAdmin(true)}
                className="gap-2 border-red-900/30 text-red-400 hover:bg-red-950/20"
              >
                <SettingsIcon className="h-4 w-4" />
                Admin Panel
              </Button>
              <Button 
                variant={showCgpa ? "primary" : "outline"} 
                onClick={() => setShowCgpa(!showCgpa)}
                className="gap-2"
              >
                {showCgpa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showCgpa ? "Hide CGPA" : "Reveal CGPA"}
              </Button>
            </>
          )}
          {user && (
            <Button 
              variant="outline" 
              onClick={() => setEditingUid(user.uid)}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Edit My Profile
            </Button>
          )}
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-950/50 shadow-2xl shadow-red-900/5">
        <CardHeader className="border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input 
                placeholder="Search by name or UID..." 
                className="pl-10 border-zinc-800 focus:border-red-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <Select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value as any)}
                className="w-[200px] border-zinc-800"
              >
                <option value="All">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto perspective-2000">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Rank</th>
                  <th className="px-6 py-4 font-medium">Student</th>
                  <th className="px-6 py-4 font-medium">Branch</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  {(isAdmin && showCgpa) && <th className="px-6 py-4 font-medium">CGPA</th>}
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <AnimatePresence mode="popLayout">
                  {filteredStudents.map((student) => (
                    <motion.tr 
                      key={student.uid}
                      initial={{ opacity: 0, rotateX: -20, y: 30, z: -100 }}
                      animate={{ opacity: 1, rotateX: 0, y: 0, z: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: 20 }}
                      whileHover={{ 
                        scale: 1.01, 
                        z: 10,
                        backgroundColor: "rgba(220, 38, 38, 0.05)",
                        transition: { duration: 0.2 }
                      }}
                      transition={{ type: "spring", damping: 25, stiffness: 120 }}
                      className={cn(
                        "group cursor-pointer transition-all duration-300",
                        user?.uid === student.uid && "bg-red-900/10 border-l-4 border-red-600"
                      )}
                      onClick={() => setViewingStudent(student)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs font-bold text-zinc-100 group-hover:bg-red-600 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all">
                          #{student.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:text-red-400 transition-colors">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-zinc-100 group-hover:text-white transition-colors">{student.displayName}</div>
                            <div className="text-xs text-zinc-500">{student.uid.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 group-hover:text-zinc-300 transition-colors">{student.branch}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-zinc-800 group-hover:border-red-900/50">{student.category}</Badge>
                      </td>
                      {(isAdmin && showCgpa) && (
                        <td className="px-6 py-4 font-mono font-bold text-red-400">
                          {student.cgpa?.toFixed(2) || 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        {(isAdmin || user?.uid === student.uid) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUid(student.uid);
                            }}
                            className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={student.status === 'Allocated' ? 'success' : 'secondary'}
                          className={cn(
                            "gap-1",
                            student.status === 'Allocated' ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            student.status === 'Allocated' ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                          )} />
                          {student.status}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Shield className="mb-2 h-12 w-12 opacity-20 text-red-500" />
                <p>No students found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDetailCard({ student, onClose }: { student: StudentRecord, onClose: () => void }) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        exit={{ scale: 0.5, rotateY: 180, opacity: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 100 }}
        className="relative h-[450px] w-full max-w-sm perspective-1000"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          className="relative h-full w-full preserve-3d cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front Side */}
          <div className="absolute inset-0 backface-hidden rounded-3xl border border-red-500/30 bg-zinc-900 p-8 shadow-2xl shadow-red-900/20">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600/10 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                  <User className="h-12 w-12" />
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow-lg">
                  #{student.rank}
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight text-white uppercase">{student.displayName}</h3>
                <p className="text-sm font-mono text-zinc-500">{student.uid.slice(0, 12)}...</p>
              </div>

              <div className="grid w-full grid-cols-2 gap-4">
                <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Branch</p>
                  <p className="text-xs font-bold text-zinc-200 truncate">{student.branch}</p>
                </div>
                <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Category</p>
                  <p className="text-xs font-bold text-zinc-200">{student.category}</p>
                </div>
              </div>

              <div className={cn(
                "w-full rounded-2xl p-4 border transition-all duration-500",
                student.status === 'Allocated' 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-500"
              )}>
                <p className="text-[10px] uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-black italic">{student.status}</p>
              </div>

              <p className="text-[10px] text-zinc-600 uppercase tracking-widest animate-pulse">Click to flip card</p>
            </div>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 backface-hidden rounded-3xl border border-red-500/30 bg-zinc-950 p-8 shadow-2xl shadow-red-900/20 [transform:rotateY(180deg)]">
            <div className="flex flex-col items-center justify-center h-full space-y-8 text-center">
              <div className="h-1 w-12 rounded-full bg-red-600/50" />
              
              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Academic Merit</h4>
                <div className="text-6xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  {student.cgpa ? student.cgpa.toFixed(2) : '??'}
                </div>
                <p className="text-xs text-zinc-600">CGPA (Confidential)</p>
              </div>

              <div className="space-y-4 w-full">
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Year</span>
                  <span className="text-zinc-200 font-bold">{student.year}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Joined</span>
                  <span className="text-zinc-200 font-bold">
                    {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-red-900/30 text-red-400 hover:bg-red-950/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                Close Details
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
