CREATE TABLE employee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id),
  member_id bigint NOT NULL UNIQUE REFERENCES organizationmember(id),
  employee_code varchar(50) NOT NULL,
  fullname text NOT NULL,
  email text NOT NULL,
  department text NOT NULL DEFAULT '',
  job_title text NOT NULL DEFAULT '',
  manager_id uuid REFERENCES employee(id),
  role varchar(20) NOT NULL DEFAULT 'EMPLOYEE',
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  start_date date,
  left_at timestamptz,
  activated_at timestamptz,
  invitation_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_role_check CHECK (role IN ('EMPLOYEE','MANAGER','HR','TUTOR','ADMIN')),
  CONSTRAINT employee_status_check CHECK (status IN ('DRAFT','INVITED','ACTIVE','SUSPENDED','LEFT')),
  CONSTRAINT employee_code_normalized CHECK (employee_code = upper(employee_code)),
  CONSTRAINT employee_email_normalized CHECK (email = lower(email))
);
--> statement-breakpoint
CREATE UNIQUE INDEX employee_org_code_unique ON employee(organization_id, employee_code);
--> statement-breakpoint
CREATE UNIQUE INDEX employee_org_email_unique ON employee(organization_id, email);
--> statement-breakpoint
CREATE INDEX employee_manager_idx ON employee(organization_id, manager_id);
--> statement-breakpoint
CREATE TABLE employee_activation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employee(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
--> statement-breakpoint
CREATE TABLE employee_course (
  employee_id uuid NOT NULL REFERENCES employee(id),
  course_id uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  PRIMARY KEY(employee_id, course_id)
);
--> statement-breakpoint
CREATE TABLE employee_cohort (
  employee_id uuid NOT NULL REFERENCES employee(id),
  cohort_id uuid NOT NULL REFERENCES cohort(id) ON DELETE CASCADE,
  PRIMARY KEY(employee_id, cohort_id)
);
--> statement-breakpoint
CREATE TABLE employee_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employee(id),
  actor_id uuid REFERENCES profile(id),
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
