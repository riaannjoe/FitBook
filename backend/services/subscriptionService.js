const Sub = require('../models/subscriptionModel');
const Member = require('../models/memberModel');
const Plan = require('../models/planModel');
const { found } = require('../utils/ensure');

// subscribe or renew: the stored procedure creates subscription + payment inside one transaction.
// If the member already has an active plan, the new one starts when the old one ends.
exports.subscribe = async ({ member_id, plan_id, method }) => {
  found(await Member.findById(member_id), 'Member');
  found(await Plan.findById(plan_id), 'Plan');
  await Sub.subscribe(member_id, plan_id, method);
  return Sub.byMember(member_id).then(rows => rows[0]);
};
