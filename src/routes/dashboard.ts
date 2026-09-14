import { Router, type Request, type Response } from "express";
import Claim, { type ClaimStatus } from "../models/Claim";
import Policy, { type PolicyType } from "../models/Policy";
import User from "../models/User";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

const CLAIM_STATUSES = ["submitted", "under-review", "approved", "denied", "closed"];
const POLICY_TYPES = ["auto", "home", "life"];

router.get("/", async (_req: Request, res: Response) => {
  const [
    totalClaims,
    claimsByStatusRaw,
    totalPolicies,
    policiesByTypeRaw,
    totalUsers,
    recentClaims,
    totalAmountRaw,
  ] = await Promise.all([
    Claim.countDocuments(),
    Claim.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Policy.countDocuments(),
    Policy.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    User.countDocuments(),
    Claim.find().sort({ createdAt: -1 }).limit(5).populate("policy").populate("assignedTo", "-password"),
    Claim.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
    ]),
  ]);

  const claimsByStatus = Object.fromEntries(CLAIM_STATUSES.map((status) => [status, 0]));
  for (const { _id, count } of claimsByStatusRaw as { _id: ClaimStatus; count: number }[]) {
    claimsByStatus[_id] = count;
  }

  const policiesByType = Object.fromEntries(POLICY_TYPES.map((type) => [type, 0]));
  for (const { _id, count } of policiesByTypeRaw as { _id: PolicyType; count: number }[]) {
    policiesByType[_id] = count;
  }

  const totalClaimAmount = totalAmountRaw[0]?.total ?? 0;

  res.status(200).json({
    totalClaims,
    claimsByStatus,
    totalPolicies,
    policiesByType,
    totalUsers,
    recentClaims,
    totalClaimAmount,
  });
});

export default router;
