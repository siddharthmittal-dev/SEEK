-- Execute in the SEEK database. Queries are read-only unless explicitly labeled.

-- 1. Multi-table INNER JOIN: application and candidate context.
SELECT a.id,u.name AS student,b.code AS branch,c.name AS company,j.title,a.status
FROM applications a
JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id
JOIN branches b ON b.id=s.branch_id JOIN jobs j ON j.id=a.job_id
JOIN placement_drives d ON d.id=j.drive_id JOIN companies c ON c.id=d.company_id
ORDER BY a.id;

-- 2. LEFT JOIN retains jobs without applicants.
SELECT j.id,j.title,COUNT(a.id) AS applicants
FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
GROUP BY j.id,j.title ORDER BY applicants DESC;

-- 3. Branch placement rates, counting unique students with accepted offers.
SELECT b.code,COUNT(DISTINCT s.id) AS registered,
 COUNT(DISTINCT CASE WHEN o.status='accepted' THEN s.id END) AS placed,
 ROUND(100*COUNT(DISTINCT CASE WHEN o.status='accepted' THEN s.id END)/NULLIF(COUNT(DISTINCT s.id),0),2) AS placement_pct
FROM branches b LEFT JOIN students s ON s.branch_id=b.id
LEFT JOIN applications a ON a.student_id=s.id LEFT JOIN offers o ON o.application_id=a.id
GROUP BY b.id,b.code;

-- 4. Aggregates and HAVING: companies that have received applications.
SELECT c.name,COUNT(DISTINCT j.id) AS jobs,COUNT(a.id) AS applications
FROM companies c LEFT JOIN placement_drives d ON d.company_id=c.id
LEFT JOIN jobs j ON j.drive_id=d.id LEFT JOIN applications a ON a.job_id=j.id
GROUP BY c.id,c.name HAVING COUNT(a.id)>0;

-- 5. Salary summaries use accepted offers only.
SELECT COUNT(*) AS accepted_offers,MIN(ctc) AS min_lpa,MAX(ctc) AS max_lpa,
 AVG(ctc) AS average_lpa,SUM(ctc) AS total_annual_ctc_lakhs
FROM offers WHERE status='accepted';

-- 6. Median using MySQL 8 window functions.
WITH ranked AS (
 SELECT ctc,ROW_NUMBER() OVER(ORDER BY ctc) AS rn,COUNT(*) OVER() AS n
 FROM offers WHERE status='accepted'
)
SELECT AVG(ctc) AS median_lpa FROM ranked WHERE rn IN (FLOOR((n+1)/2),FLOOR((n+2)/2));

-- 7. NOT EXISTS: students without an accepted offer.
SELECT s.id,u.name FROM students s JOIN users u ON u.id=s.user_id
WHERE NOT EXISTS (SELECT 1 FROM applications a JOIN offers o ON o.application_id=a.id
 WHERE a.student_id=s.id AND o.status='accepted');

-- 8. Index usage. The unique student/job pair is an indexed lookup.
EXPLAIN SELECT * FROM applications WHERE student_id=1 AND job_id=1;
EXPLAIN SELECT * FROM jobs WHERE status='published' AND application_deadline>UTC_TIMESTAMP();

-- 9. Inspection evidence.
SHOW TABLES;
SHOW CREATE TABLE applications;
SHOW INDEX FROM applications;

-- 10. Rollback demonstration: run manually in a dedicated test database only.
-- START TRANSACTION;
-- INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES(1,'viva.rollback','user',1);
-- SELECT LAST_INSERT_ID();
-- ROLLBACK;
-- SELECT * FROM audit_logs WHERE action='viva.rollback';
