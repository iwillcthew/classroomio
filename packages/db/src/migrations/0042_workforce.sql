
CREATE TABLE "workforce_activation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workforce_activation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint

CREATE TABLE "workforce_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"course_id" uuid,
	"exam_id" uuid,
	"path_id" uuid,
	"rule_id" uuid,
	"source_unit_id" uuid,
	"source_job_title_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_code" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"unit_id" uuid,
	"job_title_id" uuid,
	"manager_id" uuid,
	"access_role" text DEFAULT 'EMPLOYEE' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid,
	"actor_id" uuid NOT NULL,
	"event" text NOT NULL,
	"reason" text NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_job_title" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_learning_path" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"job_title_id" uuid NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_path_course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_rule_target" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"course_id" uuid,
	"exam_id" uuid,
	"path_id" uuid
);
--> statement-breakpoint

CREATE TABLE "workforce_training_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit_id" uuid,
	"job_title_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint

CREATE TABLE "workforce_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"leader_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "workforce_activation" ADD CONSTRAINT "workforce_activation_employee_id_workforce_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workforce_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_employee_id_workforce_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workforce_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_exam_id_exercise_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_path_id_workforce_learning_path_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."workforce_learning_path"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_rule_id_workforce_training_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."workforce_training_rule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_source_unit_id_workforce_unit_id_fk" FOREIGN KEY ("source_unit_id") REFERENCES "public"."workforce_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_assignment" ADD CONSTRAINT "workforce_assignment_source_job_title_id_workforce_job_title_id_fk" FOREIGN KEY ("source_job_title_id") REFERENCES "public"."workforce_job_title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_employee" ADD CONSTRAINT "workforce_employee_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_employee" ADD CONSTRAINT "workforce_employee_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_employee" ADD CONSTRAINT "workforce_employee_unit_id_workforce_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."workforce_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_employee" ADD CONSTRAINT "workforce_employee_job_title_id_workforce_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."workforce_job_title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_employee" ADD CONSTRAINT "workforce_employee_manager_id_workforce_employee_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."workforce_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_history" ADD CONSTRAINT "workforce_history_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_history" ADD CONSTRAINT "workforce_history_employee_id_workforce_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."workforce_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_history" ADD CONSTRAINT "workforce_history_actor_id_profile_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_job_title" ADD CONSTRAINT "workforce_job_title_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_learning_path" ADD CONSTRAINT "workforce_learning_path_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_learning_path" ADD CONSTRAINT "workforce_learning_path_job_title_id_workforce_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."workforce_job_title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_path_course" ADD CONSTRAINT "workforce_path_course_path_id_workforce_learning_path_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."workforce_learning_path"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_path_course" ADD CONSTRAINT "workforce_path_course_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_rule_target" ADD CONSTRAINT "workforce_rule_target_rule_id_workforce_training_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."workforce_training_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_rule_target" ADD CONSTRAINT "workforce_rule_target_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_rule_target" ADD CONSTRAINT "workforce_rule_target_exam_id_exercise_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_rule_target" ADD CONSTRAINT "workforce_rule_target_path_id_workforce_learning_path_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."workforce_learning_path"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_training_rule" ADD CONSTRAINT "workforce_training_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_training_rule" ADD CONSTRAINT "workforce_training_rule_unit_id_workforce_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."workforce_unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_training_rule" ADD CONSTRAINT "workforce_training_rule_job_title_id_workforce_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."workforce_job_title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_unit" ADD CONSTRAINT "workforce_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "workforce_unit" ADD CONSTRAINT "workforce_unit_leader_id_workforce_employee_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."workforce_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_assignment_course" ON "workforce_assignment" USING btree ("employee_id","course_id") WHERE "workforce_assignment"."course_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_assignment_exam" ON "workforce_assignment" USING btree ("employee_id","exam_id") WHERE "workforce_assignment"."exam_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_assignment_path" ON "workforce_assignment" USING btree ("employee_id","path_id") WHERE "workforce_assignment"."path_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_employee_code_unique" ON "workforce_employee" USING btree ("employee_code");--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_employee_profile_unique" ON "workforce_employee" USING btree ("profile_id");--> statement-breakpoint

CREATE INDEX "workforce_employee_org_unit_title" ON "workforce_employee" USING btree ("organization_id","unit_id","job_title_id");--> statement-breakpoint

CREATE INDEX "workforce_history_employee" ON "workforce_history" USING btree ("organization_id","employee_id","created_at");--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_title_org_code" ON "workforce_job_title" USING btree ("organization_id","code");--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_path_course_unique" ON "workforce_path_course" USING btree ("path_id","course_id");--> statement-breakpoint

CREATE UNIQUE INDEX "workforce_unit_org_code" ON "workforce_unit" USING btree ("organization_id","code");
--> statement-breakpoint
ALTER TABLE workforce_employee ADD CONSTRAINT workforce_employee_code_format CHECK (employee_code ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$');
--> statement-breakpoint
ALTER TABLE workforce_employee ADD CONSTRAINT workforce_employee_status_check CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'));
--> statement-breakpoint
ALTER TABLE workforce_employee ADD CONSTRAINT workforce_employee_role_check CHECK (access_role IN ('EMPLOYEE', 'HR', 'INSTRUCTOR'));
--> statement-breakpoint
ALTER TABLE workforce_rule_target ADD CONSTRAINT workforce_target_single_resource CHECK (num_nonnulls(course_id, exam_id, path_id) = 1);
--> statement-breakpoint
ALTER TABLE workforce_assignment ADD CONSTRAINT workforce_assignment_single_resource CHECK (num_nonnulls(course_id, exam_id, path_id) = 1);
--> statement-breakpoint
CREATE FUNCTION protect_workforce_employee_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code OR NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Employee identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workforce_employee_identity_immutable BEFORE UPDATE ON workforce_employee FOR EACH ROW EXECUTE FUNCTION protect_workforce_employee_identity();
--> statement-breakpoint
CREATE FUNCTION validate_workforce_unit_leaders() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM workforce_unit unit LEFT JOIN workforce_employee employee ON employee.id = unit.leader_id
    WHERE employee.organization_id IS DISTINCT FROM unit.organization_id OR employee.unit_id IS DISTINCT FROM unit.id OR employee.status <> 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Each unit requires an active employee leader belonging to that unit';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workforce_unit_leader_valid AFTER INSERT OR UPDATE ON workforce_unit DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_workforce_unit_leaders();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER workforce_employee_leader_valid AFTER UPDATE ON workforce_employee DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_workforce_unit_leaders();
