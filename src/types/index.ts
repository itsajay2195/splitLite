export interface Group {
  id: string;
  name: string;
  createdAt: Date;
  createdBy?: string;
}

export interface Member {
  id: string;
  name: string;
  upiId?: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidByMemberId: string;
  date: Date;
  category?: string;
  splitAmong: string[];
  splits?: Record<string, number>;
}

export interface Payment {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: Date;
}

export interface Activity {
  id: string;
  type: string;
  text: string;
  createdAt: Date;
}

export interface RecentGroup {
  id: string;
  name: string;
  visitedAt: string;
}
