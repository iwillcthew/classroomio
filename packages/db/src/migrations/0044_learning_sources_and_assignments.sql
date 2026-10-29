ALTER TABLE groupmember ADD COLUMN learning_access_managed boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE course_enrollment_source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profile(id),
  kind varchar(20) NOT NULL CHECK (kind IN ('SELF', 'DIRECT', 'LEGACY')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profile(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX course_enrollment_source_active_unique ON course_enrollment_source(course_id, profile_id, kind) WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX course_enrollment_source_profile_idx ON course_enrollment_source(profile_id, course_id);
--> statement-breakpoint
CREATE TABLE course_training_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_source_id uuid NOT NULL UNIQUE REFERENCES course_enrollment_source(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profile(id),
  required boolean NOT NULL DEFAULT true,
  due_date timestamptz,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO course_enrollment_source(course_id, profile_id, kind, created_at)
SELECT c.id, gm.profile_id, 'LEGACY', coalesce(gm.created_at, now())
FROM course c JOIN groupmember gm ON gm.group_id = c.group_id
WHERE gm.role_id = 3 AND gm.profile_id IS NOT NULL;
--> statement-breakpoint
UPDATE groupmember SET learning_access_managed = true WHERE role_id = 3 AND profile_id IS NOT NULL;
--> statement-breakpoint
UPDATE course SET metadata = (coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'allowSelfEnrollment', coalesce(type::text, 'SELF_PACED') <> 'COMPLIANCE' AND
    coalesce((metadata->>'showInLibrary')::boolean, (metadata->>'allowSelfEnrollment')::boolean, (metadata->>'allowNewStudent')::boolean, true)
    AND coalesce((metadata->>'allowSelfEnrollment')::boolean, (metadata->>'allowNewStudent')::boolean, true)
)) - 'showInLibrary';
