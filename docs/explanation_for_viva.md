# Viva guide

## Demonstration sequence

1. Show the landing page and explain the three portals.
2. Sign in as student; show profile, resume URL and eligibility reasons.
3. Search an eligible job and apply. Refresh to prove persistence.
4. Sign in as the job's recruiter. Shortlist the application, schedule an interview, complete it, select the student and create an offer.
5. Sign in as the student and accept the offer. Show that further applications are blocked by the single-offer policy.
6. Sign in as admin. Show the changed placement percentage, company totals and audit trail. Approve a pending recruiter.
7. Open MySQL and execute `docs/queries.sql` to discuss keys, joins, aggregation and EXPLAIN. Use the dedicated test database for destructive or invalid-insert demonstrations.

## Questions and answers

**1. Why use three tiers?** React handles presentation, Express handles authorization/business rules, and MySQL stores durable relational state. Browser code cannot bypass backend validation by changing a displayed eligibility tag.

**2. Why a shared users table?** All roles share login, password hashing, status and session revocation. Student/recruiter profiles have different attributes, so they use one-to-one role tables. Admins need no additional profile.

**3. What is the difference between a primary and foreign key?** A primary key uniquely identifies a row. A foreign key references an existing candidate key and protects referential integrity. For example, an application cannot reference a nonexistent student.

**4. Why a job_branches table?** A job may allow many branches, and a branch may qualify for many jobs. A junction table models this relationship and prevents comma-separated lists from violating atomicity.

**5. Does this schema satisfy 3NF?** Most entity dependencies are key → attributes, with branch/company/authentication facts separated. The strict qualification is ownership: if a job's recruiter is permanently defined by the drive creator, that recruiter column is derivable and should be removed. Our model treats job owner and assigned interviewer as separate authorization relationships, currently constrained by the API. See project_details.md for the full dependency argument.

**6. Why is a unique application constraint needed if the API checks first?** Two requests can race. Row locking serializes relevant work, and UNIQUE(student_id,job_id) independently prevents duplicate committed rows. A frontend disabled button is not a concurrency guarantee.

**7. What does ACID mean here?** Atomicity: offer creation and application stage update commit together. Consistency: checks and foreign keys preserve invariants. Isolation: row locks serialize conflicting eligibility/acceptance operations. Durability: committed InnoDB changes persist according to the database configuration.

**8. How is rollback tested?** The integration test starts a transaction, inserts an audit row, deliberately throws, and asserts the audit count is unchanged afterward.

**9. How do you handle deadlocks?** The transaction helper rolls back and retries ER_LOCK_DEADLOCK twice. Other failures propagate. Callbacks contain database work only, so a retry does not resend an email or perform an external action.

**10. How are passwords stored?** bcrypt with cost 12, never plaintext. Signup rejects passwords exceeding bcrypt's 72-byte limit. Password hashes are never returned in APIs.

**11. Why not put JWTs in localStorage?** The session is in an HttpOnly cookie so ordinary JavaScript cannot read it. SameSite, Origin validation and HTTPS/Secure in production address browser request risks. HttpOnly does not make every XSS attack harmless.

**12. How does logout invalidate a JWT?** users.token_version is included in the signed token and checked on every request. Logout increments the stored version; all previously issued tokens stop working. This trades fully stateless JWT validation for explicit revocation.

**13. What is RBAC versus ownership?** RBAC allows a recruiter to create a job. Ownership separately checks that the drive/job/application belongs to that recruiter. Role checks alone would let one recruiter modify another company's applicants.

**14. Why parameterized SQL?** User values are bound separately from SQL syntax. Validated role-dependent WHERE clauses are built by the server; request text is not interpolated as SQL.

**15. What is INNER JOIN versus LEFT JOIN?** INNER JOIN keeps matching relationships. LEFT JOIN keeps the left row even if no right-side record exists. Company reporting uses LEFT JOIN to retain a company with zero applications.

**16. Why COUNT(DISTINCT student_id)?** A student may have multiple applications and offers. Counting joined rows would inflate placement totals. Only distinct students with accepted offers count as placed.

**17. How is median CTC calculated?** Sort accepted-offer CTC values. For odd N use the middle value; for even N average the two middle values. An empty dataset returns null, displayed as a dash. SQL window functions can compute the same result.

**18. What does EXPLAIN show?** It shows the optimizer's plan, chosen key and estimated rows. The integration test verifies the student/job application lookup uses an index. Tiny datasets may reasonably use full scans for other queries.

**19. Why store UTC?** It avoids ambiguous server-local timestamps. The browser converts local input to UTC for writes and formats UTC responses in the viewer's timezone. Joining dates are date-only values.

**20. Why are records closed instead of deleted?** Applications and offers are historical placement evidence. Restrictive foreign keys and status changes preserve that history. Replacing branch mappings is allowed only before a job has applicants.

**21. What is missing for production?** Verified academics, identity/email verification, account recovery, deployment-specific HTTPS and proxy settings, backups, pagination, distributed rate limiting where needed, operational monitoring and independent security review. The local demonstration does not claim those are complete.

## Ownership for a three-member team

The supplied plan's division remains useful: database lead owns schema/queries, backend lead owns permissions/workflows, frontend lead owns portals. This generated implementation does not fabricate team commits or claim three people authored it. Each member should explain the whole application and then demonstrate their assigned area.
