# Internal learning participation and training assignments

MP Learning distinguishes publication, self-service enrollment, effective access, and training obligations.

## User journeys

- Published courses with self-enrollment enabled appear in the training library. Assignment-only courses do not enter discovery simply because a learner can access them.
- My Learning shows one card per course, with all participation sources. Assigned learning and self-selected learning have separate filters. Required work is determined by assignments, not course type alone.
- Course People separates learners from teaching staff. Assign training creates an obligation even when the learner already has access. Cancelling a source preserves progress and other sources.

## Data ownership

- `course_enrollment_source` stores independent SELF, DIRECT and LEGACY sources, including soft revocation. Repeated requests reuse the active source. Historical sources are retained.
- `course_training_assignment` stores the actor, required/recommended classification, deadline and authored message for a DIRECT source. Repeated assignment does not silently change an existing deadline.
- PROGRAM and COHORT sources are derived from active memberships and course links. They are not copied into permanent direct grants. Their existing goal assignments retain ownership of program/cohort obligations. An N-of-M goal never makes every component course individually required.
- `groupmember` remains the identity for authored work, exercises and certificates. `learning_access_managed` distinguishes a materialized participation identity from an unmanaged legacy grant. A retained identity alone does not grant access after its managed sources expire.
- `employee_course` remains a provisioning selection for draft employees and a compatibility projection of direct employee assignments. Self-service enrollment must never write it. Active employee screens read explicit direct assignments rather than treating historical selections as evidence of a mandatory assignment.
- Compliance cycles, validity, waivers and renewal records retain their existing authority. The latest non-waived cycle is also a contextual COMPLIANCE source, so ending cohort/program access cannot orphan a formal compliance obligation. Compliance remains assignment-only in MP Learning. Ordinary courses can also have mandatory assignments.

## Migration and compatibility

The migration preserves existing learner memberships as LEGACY sources without guessing the actor or requirement. It does not relabel historical employee-course rows as mandatory. Compliance and program/cohort goal records remain unchanged. Existing restrictive visibility and self-enrollment flags are collapsed into the single self-enrollment policy so migration never expands discoverability.

Legacy paths that cannot establish provenance retain explicitly unknown sources; newly implemented internal flows persist their exact source. Unknown provenance must remain visible for administrator review.

## Access and lifecycle

Access requires an active internal identity, an available course and at least one active learner source or appropriate teaching/administration permissions. Teaching roles are excluded from learner completion denominators. Publication and catalog changes never erase membership, work, certificates or obligations.

Source cancellation is distinct from progress reset. It affects only the chosen source and records the actor and time. Compliance cancellation must use its existing waiver/renewal controls rather than bypassing compliance records. Non-transactional notifications follow commit; retries do not send a second assignment notification.

## References

- [TalentLMS catalog](https://help.talentlms.com/hc/en-us/articles/9651507252636-How-to-work-with-the-Course-Catalog-in-TalentLMS)
- [SAP assignment properties](https://help.sap.com/docs/successfactors-learning/managing-sap-successfactors-learning-for-administrators/user-s-assigned-items-settings)
- [Docebo enrollment attributes](https://help.docebo.com/hc/en-us/articles/9170034143122-Enrolling-users-in-ILT-courses-and-sessions)
- [Totara assignment methods](https://totara.help/docs/assign-learners-to-a-program-or-certification-4)

## API and MCP compatibility

The new assignment and source lifecycle endpoints are authenticated dashboard operations. Existing versioned member-add remains supported and creates an explicit direct required assignment. Versioned member-delete now returns 409 for learners rather than deleting their work; staff deletion remains supported. Source cancellation and the required/recommended assignment form are intentionally dashboard-only in this change; no external API-key scopes are widened. MCP removal descriptions reflect the retained-history behavior, with a patch package version prepared for a later release. This change does not publish a package or OpenAPI artifact.
