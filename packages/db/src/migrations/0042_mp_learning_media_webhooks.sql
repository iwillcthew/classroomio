ALTER TABLE "groupmember" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN IF NOT EXISTS "graded_by" uuid;--> statement-breakpoint
UPDATE "groupmember" SET "completed_at" = "certificate_earned_at" WHERE "certificate_earned_at" IS NOT NULL AND "completed_at" IS NULL;--> statement-breakpoint
UPDATE "organization_api_key"
SET "scopes" = "scopes" || (
  SELECT jsonb_agg(scope)
  FROM jsonb_array_elements_text('["organization:read", "organization:write"]'::jsonb) AS scope
  WHERE NOT "organization_api_key"."scopes" ? scope
)
WHERE "type" = 'mcp'
  AND "scopes" @> '["course_import:draft:create", "course_import:draft:read", "course_import:draft:update", "course_import:draft:publish", "course:read", "course:write", "course:tag:write", "course:exercise:read", "course:exercise:write", "cohort:read", "cohort:write", "course:member:read", "course:member:write", "course:certificate:read", "course:certificate:write", "analytics:read", "media:write", "course:submission:read", "course:submission:write", "course:student:write", "audience:read", "audience:write", "team:read", "team:write"]'::jsonb
  AND NOT "scopes" @> '["organization:read", "organization:write"]'::jsonb;
