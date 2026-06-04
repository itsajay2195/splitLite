import Realm from 'realm';

export type BalanceResult = {
  memberId: string;
  name: string;
  totalPaid: number;
  totalOwes: number;
  netBalance: number;
};

export const calculateBalancesFromFirestore = (
  members: { id: string; name: string }[],
  expenses: { amount: number; paidByMemberId: string; splits?: Record<string, number>; splitAmong?: string[] }[],
  payments: { fromMemberId: string; toMemberId: string; amount: number }[],
): BalanceResult[] =>
  members.map(member => {
    const totalPaid = expenses
      .filter(e => e.paidByMemberId === member.id)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalOwes = expenses.reduce((sum, e) => {
      if (e.splits?.[member.id] !== undefined) return sum + e.splits[member.id];
      const among = e.splitAmong ?? [];
      return among.includes(member.id) ? sum + e.amount / among.length : sum;
    }, 0);

    const paymentsMade = payments
      .filter(p => p.fromMemberId === member.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentsReceived = payments
      .filter(p => p.toMemberId === member.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const netBalance = Math.round((totalPaid - totalOwes + paymentsMade - paymentsReceived) * 100) / 100;
    return { memberId: member.id, name: member.name, totalPaid, totalOwes, netBalance };
  });

export const calculateBalances = (
  members: Realm.Results<any>,
  expenses: Realm.Results<any>,
  splits: Realm.Results<any>,
  payments: Realm.Results<any>,
): BalanceResult[] => {
  const results: BalanceResult[] = [];

  members.forEach(member => {
    const memberId = member._id.toHexString();

    const totalPaid = expenses
      .filtered('paidByMemberId == $0', member._id)
      .reduce((sum: number, exp: any) => sum + exp.amount, 0);

    const totalOwes = splits
      .filtered('memberId == $0', member._id)
      .reduce((sum: number, split: any) => sum + split.amount, 0);

    const paymentsMade = payments
      .filtered('fromMemberId == $0', member._id)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const paymentsReceived = payments
      .filtered('toMemberId == $0', member._id)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const netBalance = Math.round(
      (totalPaid - totalOwes + paymentsMade - paymentsReceived) * 100,
    ) / 100;

    results.push({ memberId, name: member.name, totalPaid, totalOwes, netBalance });
  });

  return results;
};
