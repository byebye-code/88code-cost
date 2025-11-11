import { describe, expect, it } from "vitest"

import type { Subscription, SubscriptionPlan } from "~/types"
import { shouldResetSubscription } from "./reset-strategy"

const basePlan: SubscriptionPlan = {
  id: 1,
  subscriptionName: "Pro",
  billingCycle: "monthly",
  cost: 0,
  features: "",
  creditLimit: 1000,
  planType: "standard"
}

const baseSubscription: Subscription = {
  id: 1,
  employeeId: 1,
  employeeName: "Tester",
  employeeEmail: "tester@example.com",
  currentCredits: 0,
  subscriptionPlanId: 1,
  subscriptionPlanName: "Pro",
  cost: 0,
  startDate: "",
  endDate: "",
  billingCycle: "monthly",
  billingCycleDesc: "",
  remainingDays: 30,
  subscriptionStatus: "活跃中",
  subscriptionPlan: basePlan,
  isActive: true,
  autoRenew: true,
  autoResetWhenZero: false,
  lastCreditReset: null,
  resetTimes: 2
}

const buildSubscription = (
  overrides: Partial<Subscription> = {},
  planOverrides: Partial<SubscriptionPlan> = {}
): Subscription => ({
  ...baseSubscription,
  ...overrides,
  subscriptionPlan: {
    ...baseSubscription.subscriptionPlan,
    ...planOverrides,
    ...overrides.subscriptionPlan
  }
})

describe("shouldResetSubscription", () => {
  it("skips when credits already full", () => {
    const subscription = buildSubscription(undefined, { creditLimit: 100 })
    const result = shouldResetSubscription(
      { ...subscription, currentCredits: 120 },
      18
    )
    expect(result.shouldReset).toBe(false)
    expect(result.reason).toContain("已满额")
  })

  it("skips when no resets remaining", () => {
    const subscription = buildSubscription({ resetTimes: 0 })
    const result = shouldResetSubscription(subscription, 18)
    expect(result.shouldReset).toBe(false)
    expect(result.reason).toBe("无剩余重置次数")
  })

  it("resets during 18:00 window when more than one reset remains", () => {
    const subscription = buildSubscription({ resetTimes: 3 })
    const result = shouldResetSubscription(subscription, 18)
    expect(result.shouldReset).toBe(true)
    expect(result.reason).toContain("最大化利用")
  })

  it("preserves final reset during 18:00 window", () => {
    const subscription = buildSubscription({ resetTimes: 1 })
    const result = shouldResetSubscription(subscription, 18)
    expect(result.shouldReset).toBe(false)
    expect(result.reason).toContain("保留最后1次")
  })

  it("always resets during 23:00 window", () => {
    const subscription = buildSubscription({ resetTimes: 1 })
    const result = shouldResetSubscription(subscription, 23)
    expect(result.shouldReset).toBe(true)
    expect(result.reason).toContain("兜底重置")
  })
})
