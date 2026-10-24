-- FitBook sample data: every table has at least 10 rows
USE fitbook;

-- OPTIONAL RESET (clears old sample rows so ids start from 1 and foreign keys line up)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE maintenance_requests; TRUNCATE equipment; TRUNCATE member_workout_plans;
TRUNCATE workout_plan_exercises; TRUNCATE workout_plans; TRUNCATE exercises;
TRUNCATE attendance; TRUNCATE trainer_assignments; TRUNCATE trainer_schedules;
TRUNCATE trainers; TRUNCATE payments; TRUNCATE subscriptions; TRUNCATE members;
TRUNCATE membership_plans; TRUNCATE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. users (16): 1 admin, 5 trainers, 10 members
-- NOTE: password_hash is a placeholder. To log in, create real accounts with POST /api/auth/register.
INSERT INTO users(username,password_hash,role) VALUES
('admin','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','admin'),
('trainer_rahul','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','trainer'),
('trainer_priya','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','trainer'),
('trainer_amit','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','trainer'),
('trainer_neha','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','trainer'),
('trainer_karan','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','trainer'),
('member_aarav','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_diya','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_rohan','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_isha','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_vivek','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_anjali','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_kunal','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_sneha','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_harsh','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member'),
('member_pooja','$2a$10$placeholderplaceholderplaceholderplaceholderplaceholde','member');

-- 2. membership_plans (10)
INSERT INTO membership_plans(plan_name,duration_months,price,description) VALUES
('Monthly',1,1500,'1 month full access'),
('Quarterly',3,4000,'3 months full access'),
('Half-Yearly',6,7000,'6 months full access'),
('Yearly',12,12000,'12 months full access'),
('Student Monthly',1,1000,'Discounted monthly plan for students'),
('Student Quarterly',3,2700,'Discounted 3 month plan for students'),
('Couple Monthly',1,2600,'Monthly plan for two people'),
('Senior Citizen',1,1200,'Monthly plan for 60+ members'),
('Weekend Only',1,900,'Saturday and Sunday access only'),
('Premium Yearly',12,18000,'12 months with trainer and steam room');

-- 3. members (12): first 10 linked to login users 7-16, last 2 have no login
INSERT INTO members(user_id,full_name,gender,dob,phone,email,address,emergency_contact,join_date,status) VALUES
(7,'Aarav Patel','M','1998-04-12','9825010001','aarav.patel@mail.com','Adajan, Surat','9825110001','2026-08-01','active'),
(8,'Diya Shah','F','2000-09-23','9825010002','diya.shah@mail.com','Vesu, Surat','9825110002','2026-10-05','active'),
(9,'Rohan Mehta','M','1995-01-30','9825010003','rohan.mehta@mail.com','Piplod, Surat','9825110003','2026-03-15','active'),
(10,'Isha Desai','F','1992-07-18','9825010004','isha.desai@mail.com','Athwa, Surat','9825110004','2026-06-01','active'),
(11,'Vivek Joshi','M','2003-11-05','9825010005','vivek.joshi@mail.com','Varachha, Surat','9825110005','2026-09-20','expired'),
(12,'Anjali Verma','F','2002-02-14','9825010006','anjali.verma@mail.com','Katargam, Surat','9825110006','2026-07-10','expired'),
(13,'Kunal Trivedi','M','1989-06-27','9825010007','kunal.trivedi@mail.com','Udhna, Surat','9825110007','2026-10-12','active'),
(14,'Sneha Naik','F','1962-12-09','9825010008','sneha.naik@mail.com','Rander, Surat','9825110008','2026-10-01','active'),
(15,'Harsh Gandhi','M','1999-08-21','9825010009','harsh.gandhi@mail.com','Citylight, Surat','9825110009','2026-10-03','active'),
(16,'Pooja Chauhan','F','1994-03-16','9825010010','pooja.chauhan@mail.com','Bhatar, Surat','9825110010','2026-01-10','active'),
(NULL,'Manish Rana','M','1990-05-02','9825010011','manish.rana@mail.com','Pal, Surat','9825110011','2026-09-01','expired'),
(NULL,'Riya Parekh','F','2001-10-29','9825010012','riya.parekh@mail.com','Althan, Surat','9825110012','2026-09-15','suspended');

-- 4. subscriptions (12): ids 1-12, one per member
INSERT INTO subscriptions(member_id,plan_id,start_date,end_date,status) VALUES
(1,2,'2026-08-01','2026-11-01','active'),
(2,1,'2026-10-05','2026-11-05','active'),
(3,4,'2026-03-15','2027-03-15','active'),
(4,3,'2026-06-01','2026-12-01','active'),
(5,5,'2026-09-20','2026-10-20','expired'),
(6,6,'2026-07-10','2026-10-10','expired'),
(7,7,'2026-10-12','2026-11-12','active'),
(8,8,'2026-10-01','2026-11-01','active'),
(9,9,'2026-10-03','2026-11-03','active'),
(10,10,'2026-01-10','2027-01-10','active'),
(11,1,'2026-09-01','2026-10-01','expired'),
(12,2,'2026-09-15','2026-12-15','cancelled');

-- 5. payments (12): amount matches the plan price
INSERT INTO payments(member_id,subscription_id,amount,payment_date,method,status) VALUES
(1,1,4000,'2026-08-01','upi','paid'),
(2,2,1500,'2026-10-05','card','paid'),
(3,3,12000,'2026-03-15','netbanking','paid'),
(4,4,7000,'2026-06-01','cash','paid'),
(5,5,1000,'2026-09-20','upi','paid'),
(6,6,2700,'2026-07-10','card','paid'),
(7,7,2600,'2026-10-12','upi','paid'),
(8,8,1200,'2026-10-01','cash','paid'),
(9,9,900,'2026-10-03','upi','paid'),
(10,10,18000,'2026-01-10','netbanking','paid'),
(11,11,1500,'2026-09-01','cash','paid'),
(12,12,4000,'2026-09-15','card','failed');

-- 6. trainers (10): first 5 linked to login users 2-6
INSERT INTO trainers(user_id,full_name,phone,email,specialization,hire_date,salary) VALUES
(2,'Rahul Sharma','9712020001','rahul.sharma@fitbook.com','Strength Training','2023-01-15',32000),
(3,'Priya Nair','9712020002','priya.nair@fitbook.com','Yoga and Flexibility','2023-03-01',30000),
(4,'Amit Singh','9712020003','amit.singh@fitbook.com','Bodybuilding','2022-07-10',35000),
(5,'Neha Kapoor','9712020004','neha.kapoor@fitbook.com','Weight Loss','2024-02-20',28000),
(6,'Karan Malhotra','9712020005','karan.malhotra@fitbook.com','CrossFit','2024-05-05',33000),
(NULL,'Sunil Yadav','9712020006','sunil.yadav@fitbook.com','Cardio','2023-09-12',26000),
(NULL,'Meera Iyer','9712020007','meera.iyer@fitbook.com','Zumba and Aerobics','2024-08-01',27000),
(NULL,'Deepak Rathod','9712020008','deepak.rathod@fitbook.com','Powerlifting','2022-11-18',36000),
(NULL,'Kavita Bhatt','9712020009','kavita.bhatt@fitbook.com','Senior Fitness','2025-01-06',25000),
(NULL,'Arjun Reddy','9712020010','arjun.reddy@fitbook.com','Functional Training','2025-04-14',29000);

-- 7. trainer_schedules (12)
INSERT INTO trainer_schedules(trainer_id,day_of_week,start_time,end_time) VALUES
(1,'Mon','06:00:00','12:00:00'),(1,'Wed','06:00:00','12:00:00'),
(2,'Tue','07:00:00','13:00:00'),(2,'Thu','07:00:00','13:00:00'),
(3,'Mon','16:00:00','22:00:00'),(3,'Fri','16:00:00','22:00:00'),
(4,'Tue','06:00:00','11:00:00'),(5,'Sat','08:00:00','14:00:00'),
(6,'Wed','17:00:00','21:00:00'),(7,'Sun','08:00:00','12:00:00'),
(8,'Thu','15:00:00','21:00:00'),(9,'Fri','06:00:00','10:00:00');

-- 8. trainer_assignments (12)
INSERT INTO trainer_assignments(trainer_id,member_id,assigned_date,status) VALUES
(1,1,'2026-08-02','active'),(3,2,'2026-10-06','active'),(1,3,'2026-03-16','active'),
(2,4,'2026-06-02','active'),(6,5,'2026-09-21','ended'),(4,6,'2026-07-11','ended'),
(5,7,'2026-10-13','active'),(9,8,'2026-10-02','active'),(10,9,'2026-10-04','active'),
(8,10,'2026-01-11','active'),(4,11,'2026-09-02','ended'),(7,12,'2026-09-16','ended');

-- 9. attendance (20)
INSERT INTO attendance(member_id,check_in,check_out) VALUES
(1,'2026-10-19 06:30:00','2026-10-19 07:45:00'),
(2,'2026-10-19 18:00:00','2026-10-19 19:10:00'),
(3,'2026-10-20 07:00:00','2026-10-20 08:30:00'),
(4,'2026-10-20 17:30:00','2026-10-20 18:40:00'),
(7,'2026-10-20 19:00:00','2026-10-20 20:05:00'),
(8,'2026-10-21 08:00:00','2026-10-21 09:00:00'),
(9,'2026-10-21 10:15:00','2026-10-21 11:30:00'),
(10,'2026-10-21 06:00:00','2026-10-21 07:20:00'),
(1,'2026-10-22 06:35:00','2026-10-22 07:50:00'),
(3,'2026-10-22 07:05:00','2026-10-22 08:25:00'),
(4,'2026-10-22 17:45:00','2026-10-22 18:55:00'),
(2,'2026-10-22 18:10:00','2026-10-22 19:20:00'),
(10,'2026-10-23 06:05:00','2026-10-23 07:30:00'),
(7,'2026-10-23 19:10:00','2026-10-23 20:15:00'),
(8,'2026-10-23 08:05:00','2026-10-23 09:10:00'),
(9,'2026-10-23 10:20:00','2026-10-23 11:40:00'),
(1,'2026-10-24 06:30:00',NULL),
(3,'2026-10-24 07:00:00',NULL),
(10,'2026-10-24 06:10:00','2026-10-24 07:35:00'),
(2,'2026-10-24 09:00:00',NULL);

-- 10. exercises (12)
INSERT INTO exercises(name,muscle_group,description) VALUES
('Bench Press','Chest','Barbell press on a flat bench'),
('Squat','Legs','Barbell back squat'),
('Deadlift','Back','Lift barbell from floor to hips'),
('Pull-up','Back','Bodyweight pull to chin over bar'),
('Shoulder Press','Shoulders','Overhead dumbbell press'),
('Bicep Curl','Arms','Dumbbell curl for biceps'),
('Tricep Dips','Arms','Parallel bar dips'),
('Plank','Core','Hold body straight on forearms'),
('Lunges','Legs','Alternating forward lunges'),
('Treadmill Run','Cardio','Steady pace running'),
('Cycling','Cardio','Stationary bike intervals'),
('Burpees','Full Body','High intensity full body move');

-- 11. workout_plans (10)
INSERT INTO workout_plans(trainer_id,title,goal,level,created_at) VALUES
(1,'Beginner Strength Starter','muscle_gain','beginner','2026-01-10'),
(3,'Mass Builder 5 Day','muscle_gain','advanced','2026-02-12'),
(4,'Fat Burn Express','weight_loss','beginner','2026-03-05'),
(4,'Fat Burn Intermediate','weight_loss','intermediate','2026-03-20'),
(5,'CrossFit Conditioning','endurance','intermediate','2026-04-02'),
(6,'Cardio Stamina Builder','endurance','beginner','2026-04-18'),
(2,'Flexibility and Core','general','beginner','2026-05-07'),
(8,'Powerlifting Basics','muscle_gain','intermediate','2026-05-25'),
(9,'Senior Fitness Routine','general','beginner','2026-06-10'),
(10,'Functional Full Body','general','intermediate','2026-07-01');

-- 12. workout_plan_exercises (20)
INSERT INTO workout_plan_exercises(workout_plan_id,exercise_id,day_number,sets,reps) VALUES
(1,1,1,3,10),(1,2,2,3,12),(1,3,3,3,8),
(2,1,1,5,5),(2,3,2,5,5),(2,2,3,5,5),
(3,10,1,1,30),(3,12,2,4,15),(3,8,3,3,60),
(4,9,1,4,15),(4,11,2,1,40),
(5,12,1,5,20),(5,4,2,4,8),
(6,10,1,1,45),(6,11,3,1,30),
(7,8,1,4,45),(7,9,2,3,12),
(8,2,1,5,3),(8,3,2,5,3),
(9,8,1,3,30);

-- 13. member_workout_plans (12)
INSERT INTO member_workout_plans(member_id,workout_plan_id,assigned_date,end_date) VALUES
(1,1,'2026-08-02','2026-11-01'),(2,3,'2026-10-06','2026-11-05'),
(3,2,'2026-03-16','2027-03-15'),(4,7,'2026-06-02','2026-12-01'),
(5,6,'2026-09-21','2026-10-20'),(6,4,'2026-07-11','2026-10-10'),
(7,5,'2026-10-13','2026-11-12'),(8,9,'2026-10-02','2026-11-01'),
(9,10,'2026-10-04','2026-11-03'),(10,8,'2026-01-11','2027-01-10'),
(11,3,'2026-09-02','2026-10-01'),(12,7,'2026-09-16',NULL);

-- 14. equipment (12)
INSERT INTO equipment(name,category,purchase_date,cost,status) VALUES
('Treadmill T1','Cardio','2025-01-10',85000,'working'),
('Treadmill T2','Cardio','2025-01-10',85000,'working'),
('Bench Press Station','Strength','2025-02-01',40000,'working'),
('Squat Rack','Strength','2025-02-01',55000,'working'),
('Leg Press Machine','Strength','2025-03-15',95000,'working'),
('Elliptical Cross Trainer','Cardio','2025-04-20',70000,'working'),
('Stationary Bike S1','Cardio','2025-04-20',45000,'working'),
('Dumbbell Set 5-50kg','Free Weights','2025-05-05',120000,'working'),
('Cable Crossover','Strength','2025-06-12',110000,'working'),
('Rowing Machine','Cardio','2025-07-01',60000,'working'),
('Smith Machine','Strength','2025-08-18',90000,'working'),
('Old Pec Deck','Strength','2021-01-01',30000,'working');

-- 15. maintenance_requests (10): reported_by is a user_id (admin or trainer)
INSERT INTO maintenance_requests(equipment_id,reported_by,issue,reported_date,status,repair_cost,resolved_date) VALUES
(1,2,'Belt slipping while running','2026-08-10','resolved',3500,'2026-08-14'),
(2,3,'Display not working','2026-08-22','resolved',4200,'2026-08-30'),
(3,1,'Bench padding torn','2026-09-02','resolved',1800,'2026-09-05'),
(5,4,'Weight stack pin missing','2026-09-15','resolved',900,'2026-09-17'),
(6,5,'Strange noise from pedals','2026-09-25','in_progress',0,NULL),
(7,2,'Seat adjustment broken','2026-10-02','open',0,NULL),
(9,6,'Cable frayed on left side','2026-10-08','in_progress',2500,NULL),
(10,1,'Chain needs lubrication','2026-10-12','resolved',500,'2026-10-13'),
(11,3,'Safety catch stuck','2026-10-18','open',0,NULL),
(4,1,'Rust on support bars','2026-10-20','open',0,NULL);

-- Fix equipment status after triggers fired during the inserts above
UPDATE equipment SET status='working';
UPDATE equipment SET status='under_repair'
 WHERE equipment_id IN (SELECT equipment_id FROM maintenance_requests WHERE status<>'resolved');
UPDATE equipment SET status='retired' WHERE equipment_id=12;

-- Quick check: row count of every table
SELECT 'users' t, COUNT(*) n FROM users UNION ALL SELECT 'membership_plans',COUNT(*) FROM membership_plans
UNION ALL SELECT 'members',COUNT(*) FROM members UNION ALL SELECT 'subscriptions',COUNT(*) FROM subscriptions
UNION ALL SELECT 'payments',COUNT(*) FROM payments UNION ALL SELECT 'trainers',COUNT(*) FROM trainers
UNION ALL SELECT 'trainer_schedules',COUNT(*) FROM trainer_schedules UNION ALL SELECT 'trainer_assignments',COUNT(*) FROM trainer_assignments
UNION ALL SELECT 'attendance',COUNT(*) FROM attendance UNION ALL SELECT 'exercises',COUNT(*) FROM exercises
UNION ALL SELECT 'workout_plans',COUNT(*) FROM workout_plans UNION ALL SELECT 'workout_plan_exercises',COUNT(*) FROM workout_plan_exercises
UNION ALL SELECT 'member_workout_plans',COUNT(*) FROM member_workout_plans UNION ALL SELECT 'equipment',COUNT(*) FROM equipment
UNION ALL SELECT 'maintenance_requests',COUNT(*) FROM maintenance_requests;
