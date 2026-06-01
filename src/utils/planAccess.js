// Plan rank — higher = more access
export const PLAN_RANK = {
  FREE:       0,
  STARTER:    1,
  GROWTH:     2,
  PRO:        3,
  ENTERPRISE: 4,
  TRIAL:      99, // full PRO access
}

// Can user with `userPlan` access a feature requiring `requiredPlan`?
export function canAccess(requiredPlan, userPlan, userRole) {
  if (!requiredPlan) return true
  if (userRole === 'SUPER_ADMIN') return true
  const userRank     = PLAN_RANK[userPlan] ?? 0
  const requiredRank = PLAN_RANK[requiredPlan] ?? 0
  return userRank >= requiredRank
}

// Minimum plan name for display
export const PLAN_LABEL = {
  STARTER:    'Starter',
  GROWTH:     'Growth',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}
