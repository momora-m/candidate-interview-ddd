import { z } from 'zod';

export const ratingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const stageCodeSchema = z.enum([
  'DOCUMENT_SCREENING',
  'CASUAL_INTERVIEW',
  'FIRST_TECHNICAL',
  'SECOND_MANAGEMENT',
  'FINAL_EXECUTIVE',
  'OFFER_NEGOTIATION',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]);

export const createCompanySchema = z.object({
  name: z.string().min(1),
  productSummary: z.string().min(1),
  targetAudience: z.enum(['B2B_ENTERPRISE', 'B2B_SMB', 'B2C', 'C2C', 'INTERNAL_PLATFORM']),
  revenueStream: z.string().min(1),
  keyCompetitors: z.array(z.string()).optional(),
  primaryLanguages: z.array(z.string().min(1)).min(1),
  cloudPlatform: z.enum(['GCP', 'AWS', 'AZURE', 'HYBRID', 'OTHER']).optional(),
  architectureHighlights: z.array(z.string()).optional(),
  techBlogUrls: z.array(z.string()).optional(),
  overallAttractivenessSummary: z.string().optional(),
  corporateMission: z.string().optional(),
});

export const addQuestionSchema = z.object({
  category: z.enum(['CULTURE', 'TECH_STACK', 'ROADMAP', 'EVALUATION', 'ORGANIZATION']),
  targetRole: z.enum([
    'LEAD_ENGINEER',
    'ENGINEERING_MANAGER',
    'EXECUTIVE_CTO',
    'TALENT_ACQUISITION',
  ]),
  questionText: z.string().min(1),
  hypothesisOrIntent: z.string().min(1),
});

export const createApplicationSchema = z.object({
  companyId: z.string().min(1),
  positionTitle: z.string().min(1).optional(),
  jobDescriptionUrl: z.string().optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  targetSeniority: z.string().optional(),
  desirabilityRating: ratingSchema.optional(),
  whyThisRole: z.string().optional(),
  valueProposition: z.string().optional(),
  careerGrowthAlignment: z.string().optional(),
  initialStageCode: stageCodeSchema.optional(),
});

export const reviseInterviewSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  formatType: z.enum(['ONLINE', 'IN_PERSON']),
  meetingUrl: z.string().optional(),
  meetingPasscode: z.string().optional(),
  locationName: z.string().optional(),
  roomName: z.string().optional(),
  receptionInstructions: z.string().optional(),
  estimatedTravelMinutes: z.number().int().nonnegative().optional(),
  interviewerNames: z.array(z.string()).optional(),
});

export const scheduleInterviewSchema = reviseInterviewSchema.extend({
  stageCode: stageCodeSchema.optional(),
});

export const proposeScheduleSchema = z.object({
  stageCode: stageCodeSchema.optional(),
  note: z.string().optional(),
  slots: z
    .array(
      z.object({
        startTime: z.string().min(1),
        endTime: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
  formatType: z.enum(['ONLINE', 'IN_PERSON']),
  meetingUrl: z.string().optional(),
  meetingPasscode: z.string().optional(),
  locationName: z.string().optional(),
  roomName: z.string().optional(),
  receptionInstructions: z.string().optional(),
  estimatedTravelMinutes: z.number().int().nonnegative().optional(),
});

export const confirmProposedScheduleSchema = z.object({
  slotIndex: z.number().int().nonnegative(),
});

export const casualDecisionSchema = z.object({
  decision: z.enum(['PROCEED', 'WITHDRAW']),
  reason: z.string().optional(),
});

export const rescheduleInterviewSchema = z.object({
  newStartTime: z.string().min(1),
  newEndTime: z.string().min(1),
});

export const assignQuestionSchema = z.object({
  stockedQuestionId: z.string().min(1),
  customizedText: z.string().optional(),
});

export const recordAnswerSchema = z.object({
  answer: z.string().min(1),
  insightRating: ratingSchema.optional(),
});

export const recordReflectionSchema = z.object({
  candidatePerformanceRating: ratingSchema,
  companyImpressionRating: ratingSchema,
  keyLearningsAndInsights: z.string().min(1),
  concernsOrRedFlags: z.string().optional(),
  nextActionNotes: z.string().min(1),
});

export const addTodoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priorityLevel: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().optional(),
  sessionId: z.string().optional(),
});

export const updateTodoSchema = z.object({
  newStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED']).optional(),
});

export const closeApplicationSchema = z.object({
  action: z.enum(['REJECT', 'WITHDRAW', 'ACCEPT_OFFER']),
  reason: z.string().optional(),
});
