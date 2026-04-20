import Realm from 'realm';

export class Group extends Realm.Object<Group> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  createdAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'Group',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      name: 'string',
      createdAt: 'date',
    },
  };
}

export class Member extends Realm.Object<Member> {
  _id!: Realm.BSON.ObjectId;
  groupId!: Realm.BSON.ObjectId;
  name!: string;
  upiId?: string;

  static schema: Realm.ObjectSchema = {
    name: 'Member',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      groupId: 'objectId',
      name: 'string',
      upiId: 'string?',
    },
  };
}

export class Expense extends Realm.Object<Expense> {
  _id!: Realm.BSON.ObjectId;
  groupId!: Realm.BSON.ObjectId;
  amount!: number;
  paidByMemberId!: Realm.BSON.ObjectId;
  description!: string;
  date!: Date;
  category?: string;

  static schema: Realm.ObjectSchema = {
    name: 'Expense',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      groupId: 'objectId',
      amount: 'double',
      paidByMemberId: 'objectId',
      description: 'string',
      date: 'date',
      category: 'string?',
    },
  };
}

export class Payment extends Realm.Object<Payment> {
  _id!: Realm.BSON.ObjectId;
  groupId!: Realm.BSON.ObjectId;
  fromMemberId!: Realm.BSON.ObjectId;
  toMemberId!: Realm.BSON.ObjectId;
  amount!: number;
  date!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'Payment',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      groupId: 'objectId',
      fromMemberId: 'objectId',
      toMemberId: 'objectId',
      amount: 'double',
      date: 'date',
    },
  };
}

export class ExpenseSplit extends Realm.Object<ExpenseSplit> {
  _id!: Realm.BSON.ObjectId;
  expenseId!: Realm.BSON.ObjectId;
  memberId!: Realm.BSON.ObjectId;
  amount!: number;

  static schema: Realm.ObjectSchema = {
    name: 'ExpenseSplit',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      expenseId: 'objectId',
      memberId: 'objectId',
      amount: 'double',
    },
  };
}
