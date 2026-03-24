export type Branch = 'Information Technology' | 'Electrical Engineering' | 'Mechanical Engineering' | 'Civil Engineering' | 'Computer Science';
export type Category = 'Open' | 'OBC' | 'EWS' | 'SC' | 'ST' | 'NT' | 'PwD';
export type Role = 'student' | 'admin';

export interface Profile {
  uid: string;
  displayName: string;
  branch: Branch;
  category: Category;
  year: string;
  cgpa: number;
  role: Role;
  createdAt: any;
}

export interface PrivateData {
  email: string;
}

export interface StudentRecord extends Profile {
  rank?: number;
  status?: 'Allocated' | 'Waiting';
}

export interface GlobalSettings {
  seatDistribution: Record<string, number>;
  categories: string[];
  instaId: string;
}

export const BRANCHES: Branch[] = [
  'Information Technology',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Computer Science'
];

export const CATEGORIES: Category[] = ['Open', 'OBC', 'EWS', 'SC', 'ST', 'NT', 'PwD'];

export const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
