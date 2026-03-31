export type Settlement = {
  from: string; // memberId
  fromName: string;
  to: string; // memberId
  toName: string;
  amount: number;
};

type BalanceMap = {
  memberId: string;
  name: string;
  net: number; // positive = owed money, negative = owes money
};

/**
 * Min-cash-flow algorithm: reduces N settlements to the minimum
 * number of transactions needed to settle a group.
 *
 * e.g. A owes B ₹100, B owes C ₹100 → simplifies to A pays C ₹100 (1 txn instead of 2)
 */
export function simplifyDebts(balances: BalanceMap[]): Settlement[] {
  const nets = balances
    .map(b => ({ ...b }))
    .filter(b => Math.abs(b.net) > 0.01);

  const settlements: Settlement[] = [];

  while (nets.length > 0) {
    const maxCreditor = nets.reduce((max, b) => (b.net > max.net ? b : max), nets[0]);
    const maxDebtor = nets.reduce((min, b) => (b.net < min.net ? b : min), nets[0]);

    if (Math.abs(maxCreditor.net) < 0.01 || Math.abs(maxDebtor.net) < 0.01) break;
    if (maxCreditor.net <= 0 || maxDebtor.net >= 0) break;

    const amount = Math.min(maxCreditor.net, -maxDebtor.net);

    settlements.push({
      from: maxDebtor.memberId,
      fromName: maxDebtor.name,
      to: maxCreditor.memberId,
      toName: maxCreditor.name,
      amount: parseFloat(amount.toFixed(2)),
    });

    maxCreditor.net -= amount;
    maxDebtor.net += amount;
  }

  return settlements;
}
