import * as React from 'react';
import { db, auth } from '@/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { GlobalSettings, CATEGORIES } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Shield, Save, Plus, Trash2, Instagram, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function AdminPanel({ initialSettings }: { initialSettings: GlobalSettings }) {
  const [settings, setSettings] = React.useState<GlobalSettings>(initialSettings);
  const [newCategory, setNewCategory] = React.useState('');

  const handleUpdateSeat = (category: string, value: string) => {
    const num = parseInt(value) || 0;
    setSettings({
      ...settings,
      seatDistribution: {
        ...settings.seatDistribution,
        [category]: num
      }
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (settings.categories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    const updatedCategories = [...settings.categories, newCategory.trim()];
    const updatedDistribution = { ...settings.seatDistribution, [newCategory.trim()]: 0 };
    setSettings({
      ...settings,
      categories: updatedCategories,
      seatDistribution: updatedDistribution
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    const updatedCategories = settings.categories.filter(c => c !== cat);
    const { [cat]: _, ...updatedDistribution } = settings.seatDistribution;
    setSettings({
      ...settings,
      categories: updatedCategories,
      seatDistribution: updatedDistribution
    });
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      toast.success('Settings updated successfully!');
    } catch (e: any) {
      toast.error('Failed to update settings: ' + e.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, rotateY: -10, perspective: 1000 }}
      animate={{ opacity: 1, rotateY: 0 }}
      className="space-y-8 py-8"
    >
      <div className="flex items-center gap-3 border-l-4 border-red-600 pl-4">
        <Shield className="h-8 w-8 text-red-500" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Admin Control</h2>
          <p className="text-zinc-400">Configure global seat distribution and categories.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Seat Distribution */}
        <Card className="border-red-900/20 bg-zinc-950/50 shadow-2xl shadow-red-900/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <SettingsIcon className="h-5 w-5" />
              Seat Distribution
            </CardTitle>
            <CardDescription>Set the number of seats per category per branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.categories.map(cat => (
              <div key={cat} className="flex items-center justify-between gap-4 rounded-lg bg-zinc-900/50 p-3 border border-zinc-800">
                <Label className="font-medium text-zinc-300">{cat}</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    className="w-20 border-red-900/30 focus:border-red-500"
                    value={settings.seatDistribution[cat] || 0}
                    onChange={(e) => handleUpdateSeat(cat, e.target.value)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-zinc-500 hover:text-red-500"
                    onClick={() => handleRemoveCategory(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Input 
                placeholder="New Category Name..." 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="border-zinc-800"
              />
              <Button onClick={handleAddCategory} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global Config */}
        <Card className="border-red-900/20 bg-zinc-950/50 shadow-2xl shadow-red-900/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Instagram className="h-5 w-5" />
              Owner Information
            </CardTitle>
            <CardDescription>Manage global owner contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Instagram ID</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input 
                  className="pl-10 border-red-900/30 focus:border-red-500"
                  value={settings?.instaId || ''}
                  onChange={(e) => setSettings(s => s ? { ...s, instaId: e.target.value } : null)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-900 pt-6">
            <Button onClick={handleSave} className="w-full gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20">
              <Save className="h-4 w-4" />
              Save All Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  );
}
