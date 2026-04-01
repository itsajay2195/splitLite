import Realm from 'realm';

export type BalanceResult = {
  memberId: string;
  name: string;
  totalPaid: number;
  totalOwes: number;
  netBalance: number;
};

export const calculateBalances = (
  members: Realm.Results<any>,
  expenses: Realm.Results<any>,
  splits: Realm.Results<any>,
  payments: Realm.Results<any>,
): BalanceResult[] => {
  const results: BalanceResult[] = [];

  members.forEach(member => {
    const memberId = member._id.toHexString();

    // Amount paid for group expenses
    const totalPaid = expenses
      .filtered('paidByMemberId == $0', member._id)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Share owed from expense splits
    const totalOwes = splits
      .filtered('memberId == $0', member._id)
      .reduce((sum, split) => sum + split.amount, 0);

    // Manual payments made by this member (reduces what they owe)
    const paymentsMade = payments
      .filtered('fromMemberId == $0', member._id)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // Manual payments received by this member (reduces what they are owed)
    const paymentsReceived = payments
      .filtered('toMemberId == $0', member._id)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // net > 0 = gets money back, net < 0 = owes money
    const netBalance = Math.round((totalPaid - totalOwes + paymentsMade - paymentsReceived) * 100) / 100;

    results.push({
      memberId,
      name: member.name,
      totalPaid,
      totalOwes,
      netBalance,
    });
  });

  return results;
};
