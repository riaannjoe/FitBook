-- FitBook: Smart Gym Management System (MySQL 8)
CREATE DATABASE IF NOT EXISTS fitbook;
USE fitbook;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','trainer','member') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE membership_plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  duration_months INT NOT NULL CHECK (duration_months > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  description VARCHAR(255)
);

CREATE TABLE members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  gender ENUM('M','F','O') NOT NULL,
  dob DATE NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  address VARCHAR(255),
  emergency_contact VARCHAR(15),
  join_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('active','expired','suspended') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active','expired','cancelled') DEFAULT 'active',
  CHECK (end_date > start_date),
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(plan_id)
);

CREATE TABLE trainers (
  trainer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  specialization VARCHAR(100),
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2) CHECK (salary >= 0),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE trainer_schedules (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE (trainer_id, day_of_week, start_time),
  FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id) ON DELETE CASCADE
);

CREATE TABLE trainer_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  member_id INT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('active','ended') DEFAULT 'active',
  FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);

CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out DATETIME NULL,
  CHECK (check_out IS NULL OR check_out > check_in),
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);

CREATE TABLE exercises (
  exercise_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  muscle_group VARCHAR(50) NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE workout_plans (
  workout_plan_id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  goal ENUM('weight_loss','muscle_gain','endurance','general') NOT NULL,
  level ENUM('beginner','intermediate','advanced') NOT NULL,
  created_at DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (trainer_id) REFERENCES trainers(trainer_id)
);

CREATE TABLE workout_plan_exercises (
  wpe_id INT AUTO_INCREMENT PRIMARY KEY,
  workout_plan_id INT NOT NULL,
  exercise_id INT NOT NULL,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  sets INT NOT NULL CHECK (sets > 0),
  reps INT NOT NULL CHECK (reps > 0),
  UNIQUE (workout_plan_id, exercise_id, day_number),
  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(workout_plan_id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

CREATE TABLE member_workout_plans (
  mwp_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  workout_plan_id INT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  end_date DATE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(workout_plan_id)
);

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  subscription_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  method ENUM('cash','card','upi','netbanking') NOT NULL,
  status ENUM('paid','pending','failed') DEFAULT 'paid',
  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id)
);

CREATE TABLE equipment (
  equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  purchase_date DATE,
  cost DECIMAL(10,2) CHECK (cost >= 0),
  status ENUM('working','under_repair','retired') DEFAULT 'working'
);

CREATE TABLE maintenance_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  reported_by INT NOT NULL,
  issue VARCHAR(255) NOT NULL,
  reported_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('open','in_progress','resolved') DEFAULT 'open',
  repair_cost DECIMAL(10,2) DEFAULT 0,
  resolved_date DATE NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
  FOREIGN KEY (reported_by) REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX idx_att_member_date ON attendance(member_id, check_in);
CREATE INDEX idx_sub_end ON subscriptions(end_date);
CREATE INDEX idx_pay_date ON payments(payment_date);

-- Views
CREATE VIEW v_dashboard AS
SELECT
 (SELECT COUNT(*) FROM subscriptions WHERE status='active' AND end_date>=CURRENT_DATE) AS active_memberships,
 (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='paid'
    AND MONTH(payment_date)=MONTH(CURRENT_DATE) AND YEAR(payment_date)=YEAR(CURRENT_DATE)) AS monthly_revenue,
 (SELECT COUNT(*) FROM attendance WHERE DATE(check_in)=CURRENT_DATE) AS todays_attendance,
 (SELECT COUNT(*) FROM maintenance_requests WHERE status<>'resolved') AS open_issues;

-- Stored procedure: subscribe/renew (TRANSACTION)
DELIMITER //
CREATE PROCEDURE sp_subscribe(IN p_member INT, IN p_plan INT, IN p_method VARCHAR(20))
BEGIN
  DECLARE v_months INT; DECLARE v_price DECIMAL(10,2); DECLARE v_start DATE; DECLARE v_sub INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
    SELECT duration_months, price INTO v_months, v_price FROM membership_plans WHERE plan_id=p_plan;
    SELECT COALESCE(MAX(end_date), CURRENT_DATE) INTO v_start FROM subscriptions
      WHERE member_id=p_member AND status='active' AND end_date>=CURRENT_DATE;
    INSERT INTO subscriptions(member_id,plan_id,start_date,end_date)
      VALUES(p_member,p_plan,v_start,DATE_ADD(v_start,INTERVAL v_months MONTH));
    SET v_sub = LAST_INSERT_ID();
    INSERT INTO payments(member_id,subscription_id,amount,method) VALUES(p_member,v_sub,v_price,p_method);
    UPDATE members SET status='active' WHERE member_id=p_member;
  COMMIT;
END//

-- Trigger: set equipment status when issue reported / resolved
CREATE TRIGGER trg_maint_ins AFTER INSERT ON maintenance_requests
FOR EACH ROW UPDATE equipment SET status='under_repair' WHERE equipment_id=NEW.equipment_id//
CREATE TRIGGER trg_maint_upd AFTER UPDATE ON maintenance_requests
FOR EACH ROW BEGIN
  IF NEW.status='resolved' THEN UPDATE equipment SET status='working' WHERE equipment_id=NEW.equipment_id; END IF;
END//
DELIMITER ;

-- Sample data (admin password must be created via API /api/auth/register)
INSERT INTO membership_plans(plan_name,duration_months,price,description) VALUES
('Monthly',1,1500,'1 month access'),('Quarterly',3,4000,'3 months'),('Yearly',12,12000,'12 months');
INSERT INTO exercises(name,muscle_group) VALUES
('Bench Press','Chest'),('Squat','Legs'),('Deadlift','Back'),('Pull-up','Back'),('Treadmill Run','Cardio');
INSERT INTO equipment(name,category,purchase_date,cost) VALUES
('Treadmill T1','Cardio','2025-01-10',85000),('Bench Press Station','Strength','2025-02-01',40000);
