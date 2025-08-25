import z from "zod";

// Goal schemas
export const CreateGoalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  target_frequency: z.enum(["daily", "weekly", "monthly"]),
});

export const UpdateGoalSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  target_frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  is_active: z.boolean().optional(),
});

export const GoalSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  target_frequency: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Daily log schemas
export const CreateDailyLogSchema = z.object({
  goal_id: z.number(),
  log_date: z.string(),
  is_completed: z.boolean(),
  notes: z.string().optional(),
});

export const UpdateDailyLogSchema = z.object({
  id: z.number(),
  is_completed: z.boolean().optional(),
  notes: z.string().optional(),
});

export const DailyLogSchema = z.object({
  id: z.number(),
  goal_id: z.number(),
  log_date: z.string(),
  is_completed: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// AI suggestion schemas
export const AISuggestionSchema = z.object({
  id: z.number(),
  suggestion_text: z.string(),
  suggestion_type: z.string().nullable(),
  is_used: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateAISuggestionRequestSchema = z.object({
  context: z.string().optional(),
  type: z.enum(["motivation", "tip", "reminder", "health", "productivity", "mindfulness"]).optional(),
});

// Response schemas
export const GoalsResponseSchema = z.object({
  goals: z.array(GoalSchema),
});

export const DailyLogsResponseSchema = z.object({
  logs: z.array(DailyLogSchema),
});

export const AISuggestionResponseSchema = z.object({
  suggestion: AISuggestionSchema,
});

// Derived types
export type Goal = z.infer<typeof GoalSchema>;
export type CreateGoal = z.infer<typeof CreateGoalSchema>;
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
export type DailyLog = z.infer<typeof DailyLogSchema>;
export type CreateDailyLog = z.infer<typeof CreateDailyLogSchema>;
export type UpdateDailyLog = z.infer<typeof UpdateDailyLogSchema>;
export type AISuggestion = z.infer<typeof AISuggestionSchema>;
export type CreateAISuggestionRequest = z.infer<typeof CreateAISuggestionRequestSchema>;
