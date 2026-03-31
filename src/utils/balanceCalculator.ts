import Realm from 'realm';

type BalanceResult = {
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
): BalanceResult[] => {
  const results: BalanceResult[] = [];

  members.forEach(member => {
    const memberId = member._id.toHexString();

    const totalPaid = expenses
      .filtered('paidByMemberId == $0', member._id)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const totalOwes = splits
      .filtered('memberId == $0', member._id)
      .reduce((sum, split) => sum + split.amount, 0);

    results.push({
      memberId,
      name: member.name,
      totalPaid,
      totalOwes,
      netBalance: totalPaid - totalOwes,
    });
  });

  return results;
};
