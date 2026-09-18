import type { ApiLocale } from '../api/client';

// Presentation only. These keys come from Atlas-OS commit
// 8c2c164bf256295577ed1cea2879d801d13dd879, mobile-api/contracts.ts
// and journey/types.ts. Core still owns status, ordering, and progression.
const applicationLabels = {
  planning: ['规划中', 'Planning'], preparing: ['准备材料', 'Preparing materials'],
  ready_to_submit: ['待提交', 'Ready to submit'], submitted: ['官网申请进行中', 'Official application in progress'],
  supplement_required: ['需要补充材料', 'Additional materials needed'], waiting_result: ['等待结果', 'Awaiting result'],
  offer_received: ['已收到录取', 'Offer received'], accepted: ['已接受', 'Accepted'],
  declined: ['未录取', 'Not admitted'], withdrawn: ['已撤回', 'Withdrawn'], closed: ['已结束', 'Closed'],
} as const;
const stageLabels = {
  study_profile: ['留学档案', 'Study profile'], school_plan: ['选校方案', 'School plan'],
  applications: ['学校申请', 'Applications'], offer_decision: ['录取选择', 'Offer decision'],
  visa: ['签证办理', 'Visa'], pre_departure: ['行前准备', 'Pre-departure'],
  arrival: ['抵达入住', 'Arrival'], settling_in: ['生活安顿', 'Settling in'],
} as const;
const stageStateLabels = {
  completed: ['已完成', 'Completed'], current: ['当前阶段', 'Current'], upcoming: ['后续阶段', 'Upcoming'],
} as const;
const matterLabels = {
  ready: ['可以开始', 'Ready'], in_progress: ['进行中', 'In progress'],
  waiting: ['等待中', 'Waiting'], blocked: ['暂时受阻', 'Blocked'], completed: ['已完成', 'Completed'],
} as const;
function label(labels: Readonly<Record<string, readonly [string, string]>>, code: string, locale: ApiLocale) {
  const copy = Object.hasOwn(labels, code) ? labels[code] : undefined;
  return copy?.[locale === 'zh' ? 0 : 1] ?? (locale === 'zh' ? '暂无法显示，请反馈给开发团队' : 'Not available; please report this to the development team');
}
export const applicationStatusLabel = (code: string, locale: ApiLocale) => label(applicationLabels, code, locale);
export const journeyStageLabel = (code: string, locale: ApiLocale) => label(stageLabels, code, locale);
export const journeyStateLabel = (code: string, locale: ApiLocale) => label(stageStateLabels, code, locale);
export const matterStatusLabel = (code: string, locale: ApiLocale) => label(matterLabels, code, locale);
