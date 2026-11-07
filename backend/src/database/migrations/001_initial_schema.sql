CREATE TABLE users (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 role ENUM('student','recruiter','admin') NOT NULL,
 status ENUM('active','pending','rejected','suspended') NOT NULL DEFAULT 'active',
 token_version INT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE branches (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(12) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL UNIQUE) ENGINE=InnoDB;
CREATE TABLE companies (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, industry VARCHAR(100) NOT NULL, website VARCHAR(500), description TEXT) ENGINE=InnoDB;
CREATE TABLE students (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL UNIQUE,
 enrollment VARCHAR(40) NOT NULL UNIQUE, branch_id INT UNSIGNED NOT NULL,
 cgpa DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK(cgpa BETWEEN 0 AND 10),
 backlogs SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 graduation_year SMALLINT UNSIGNED NOT NULL, resume_url VARCHAR(1000), phone VARCHAR(30), skills VARCHAR(500),
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;
CREATE TABLE recruiters (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL UNIQUE,
 company_id INT UNSIGNED NOT NULL, designation VARCHAR(100),
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;
CREATE TABLE placement_drives (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id INT UNSIGNED NOT NULL,
 created_by_recruiter_id INT UNSIGNED NOT NULL, title VARCHAR(150) NOT NULL,
 start_date DATE NOT NULL, end_date DATE NOT NULL, status ENUM('active','closed','cancelled') NOT NULL DEFAULT 'active',
 CHECK(end_date >= start_date), FOREIGN KEY(company_id) REFERENCES companies(id),
 FOREIGN KEY(created_by_recruiter_id) REFERENCES recruiters(id)
) ENGINE=InnoDB;
CREATE TABLE jobs (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, drive_id INT UNSIGNED NOT NULL,
 created_by_recruiter_id INT UNSIGNED NOT NULL, title VARCHAR(150) NOT NULL,
 description TEXT NOT NULL, location VARCHAR(100) NOT NULL,
 employment_type ENUM('Full-time','Internship') NOT NULL,
 ctc_min DECIMAL(8,2) NOT NULL CHECK(ctc_min >= 0), ctc_max DECIMAL(8,2) NOT NULL,
 min_cgpa DECIMAL(4,2) NOT NULL CHECK(min_cgpa BETWEEN 0 AND 10),
 max_backlogs SMALLINT UNSIGNED NOT NULL DEFAULT 0, graduation_year SMALLINT UNSIGNED NOT NULL,
 application_deadline DATETIME NOT NULL, status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(ctc_max >= ctc_min), FOREIGN KEY(drive_id) REFERENCES placement_drives(id),
 FOREIGN KEY(created_by_recruiter_id) REFERENCES recruiters(id), INDEX(status,application_deadline)
) ENGINE=InnoDB;
CREATE TABLE job_branches (
 job_id INT UNSIGNED NOT NULL, branch_id INT UNSIGNED NOT NULL,
 PRIMARY KEY(job_id,branch_id), FOREIGN KEY(job_id) REFERENCES jobs(id), FOREIGN KEY(branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;
CREATE TABLE applications (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL, job_id INT UNSIGNED NOT NULL,
 status ENUM('applied','shortlisted','interview','selected','rejected','withdrawn','offered') NOT NULL DEFAULT 'applied',
 applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE(student_id,job_id), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(job_id) REFERENCES jobs(id), INDEX(status)
) ENGINE=InnoDB;
CREATE TABLE interviews (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, application_id INT UNSIGNED NOT NULL,
 recruiter_id INT UNSIGNED NOT NULL, round_number SMALLINT UNSIGNED NOT NULL CHECK(round_number > 0),
 type VARCHAR(100) NOT NULL, scheduled_at DATETIME NOT NULL, location VARCHAR(500) NOT NULL,
 status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled', feedback TEXT,
 UNIQUE(application_id,round_number), FOREIGN KEY(application_id) REFERENCES applications(id),
 FOREIGN KEY(recruiter_id) REFERENCES recruiters(id), INDEX(scheduled_at)
) ENGINE=InnoDB;
CREATE TABLE offers (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, application_id INT UNSIGNED NOT NULL UNIQUE,
 ctc DECIMAL(8,2) NOT NULL CHECK(ctc >= 0), joining_date DATE NOT NULL,
 response_deadline DATETIME NOT NULL, status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(application_id) REFERENCES applications(id)
) ENGINE=InnoDB;
CREATE TABLE audit_logs (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NOT NULL,
 action VARCHAR(100) NOT NULL, entity_type VARCHAR(40) NOT NULL, entity_id INT UNSIGNED NOT NULL,
 details VARCHAR(500), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(actor_user_id) REFERENCES users(id), INDEX(actor_user_id,created_at)
) ENGINE=InnoDB;
