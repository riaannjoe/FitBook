-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: fitbook
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `check_in` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_out` datetime DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  KEY `idx_att_member_date` (`member_id`,`check_in`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_chk_1` CHECK (((`check_out` is null) or (`check_out` > `check_in`)))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (1,1,'2026-10-19 06:30:00','2026-10-19 07:45:00'),(2,2,'2026-10-19 18:00:00','2026-10-19 19:10:00'),(3,3,'2026-10-20 07:00:00','2026-10-20 08:30:00'),(4,4,'2026-10-20 17:30:00','2026-10-20 18:40:00'),(5,7,'2026-10-20 19:00:00','2026-10-20 20:05:00'),(6,8,'2026-10-21 08:00:00','2026-10-21 09:00:00'),(7,9,'2026-10-21 10:15:00','2026-10-21 11:30:00'),(8,10,'2026-10-21 06:00:00','2026-10-21 07:20:00'),(9,1,'2026-10-22 06:35:00','2026-10-22 07:50:00'),(10,3,'2026-10-22 07:05:00','2026-10-22 08:25:00'),(11,4,'2026-10-22 17:45:00','2026-10-22 18:55:00'),(12,2,'2026-10-22 18:10:00','2026-10-22 19:20:00'),(13,10,'2026-10-23 06:05:00','2026-10-23 07:30:00'),(14,7,'2026-10-23 19:10:00','2026-10-23 20:15:00'),(15,8,'2026-10-23 08:05:00','2026-10-23 09:10:00'),(16,9,'2026-10-23 10:20:00','2026-10-23 11:40:00'),(17,1,'2026-10-24 06:30:00',NULL),(18,3,'2026-10-24 07:00:00',NULL),(19,10,'2026-10-24 06:10:00','2026-10-24 07:35:00'),(20,2,'2026-10-24 09:00:00',NULL);
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `equipment_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `purchase_date` date DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `status` enum('working','under_repair','retired') DEFAULT 'working',
  PRIMARY KEY (`equipment_id`),
  CONSTRAINT `equipment_chk_1` CHECK ((`cost` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment`
--

LOCK TABLES `equipment` WRITE;
/*!40000 ALTER TABLE `equipment` DISABLE KEYS */;
INSERT INTO `equipment` VALUES (1,'Treadmill T1','Cardio','2025-01-10',85000.00,'working'),(2,'Treadmill T2','Cardio','2025-01-10',85000.00,'working'),(3,'Bench Press Station','Strength','2025-02-01',40000.00,'working'),(4,'Squat Rack','Strength','2025-02-01',55000.00,'under_repair'),(5,'Leg Press Machine','Strength','2025-03-15',95000.00,'working'),(6,'Elliptical Cross Trainer','Cardio','2025-04-20',70000.00,'under_repair'),(7,'Stationary Bike S1','Cardio','2025-04-20',45000.00,'under_repair'),(8,'Dumbbell Set 5-50kg','Free Weights','2025-05-05',120000.00,'working'),(9,'Cable Crossover','Strength','2025-06-12',110000.00,'under_repair'),(10,'Rowing Machine','Cardio','2025-07-01',60000.00,'working'),(11,'Smith Machine','Strength','2025-08-18',90000.00,'under_repair'),(12,'Old Pec Deck','Strength','2021-01-01',30000.00,'retired');
/*!40000 ALTER TABLE `equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercises`
--

DROP TABLE IF EXISTS `exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercises` (
  `exercise_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `muscle_group` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`exercise_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercises`
--

LOCK TABLES `exercises` WRITE;
/*!40000 ALTER TABLE `exercises` DISABLE KEYS */;
INSERT INTO `exercises` VALUES (1,'Bench Press','Chest','Barbell press on a flat bench'),(2,'Squat','Legs','Barbell back squat'),(3,'Deadlift','Back','Lift barbell from floor to hips'),(4,'Pull-up','Back','Bodyweight pull to chin over bar'),(5,'Shoulder Press','Shoulders','Overhead dumbbell press'),(6,'Bicep Curl','Arms','Dumbbell curl for biceps'),(7,'Tricep Dips','Arms','Parallel bar dips'),(8,'Plank','Core','Hold body straight on forearms'),(9,'Lunges','Legs','Alternating forward lunges'),(10,'Treadmill Run','Cardio','Steady pace running'),(11,'Cycling','Cardio','Stationary bike intervals'),(12,'Burpees','Full Body','High intensity full body move');
/*!40000 ALTER TABLE `exercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_requests`
--

DROP TABLE IF EXISTS `maintenance_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `reported_by` int NOT NULL,
  `issue` varchar(255) NOT NULL,
  `reported_date` date NOT NULL DEFAULT (curdate()),
  `status` enum('open','in_progress','resolved') DEFAULT 'open',
  `repair_cost` decimal(10,2) DEFAULT '0.00',
  `resolved_date` date DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `equipment_id` (`equipment_id`),
  KEY `reported_by` (`reported_by`),
  CONSTRAINT `maintenance_requests_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`),
  CONSTRAINT `maintenance_requests_ibfk_2` FOREIGN KEY (`reported_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_requests`
--

LOCK TABLES `maintenance_requests` WRITE;
/*!40000 ALTER TABLE `maintenance_requests` DISABLE KEYS */;
INSERT INTO `maintenance_requests` VALUES (1,1,2,'Belt slipping while running','2026-08-10','resolved',3500.00,'2026-08-14'),(2,2,3,'Display not working','2026-08-22','resolved',4200.00,'2026-08-30'),(3,3,1,'Bench padding torn','2026-09-02','resolved',1800.00,'2026-09-05'),(4,5,4,'Weight stack pin missing','2026-09-15','resolved',900.00,'2026-09-17'),(5,6,5,'Strange noise from pedals','2026-09-25','in_progress',0.00,NULL),(6,7,2,'Seat adjustment broken','2026-10-02','open',0.00,NULL),(7,9,6,'Cable frayed on left side','2026-10-08','in_progress',2500.00,NULL),(8,10,1,'Chain needs lubrication','2026-10-12','resolved',500.00,'2026-10-13'),(9,11,3,'Safety catch stuck','2026-10-18','open',0.00,NULL),(10,4,1,'Rust on support bars','2026-10-20','open',0.00,NULL);
/*!40000 ALTER TABLE `maintenance_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_workout_plans`
--

DROP TABLE IF EXISTS `member_workout_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_workout_plans` (
  `mwp_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `workout_plan_id` int NOT NULL,
  `assigned_date` date NOT NULL DEFAULT (curdate()),
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`mwp_id`),
  KEY `member_id` (`member_id`),
  KEY `workout_plan_id` (`workout_plan_id`),
  CONSTRAINT `member_workout_plans_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `member_workout_plans_ibfk_2` FOREIGN KEY (`workout_plan_id`) REFERENCES `workout_plans` (`workout_plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_workout_plans`
--

LOCK TABLES `member_workout_plans` WRITE;
/*!40000 ALTER TABLE `member_workout_plans` DISABLE KEYS */;
INSERT INTO `member_workout_plans` VALUES (1,1,1,'2026-08-02','2026-11-01'),(2,2,3,'2026-10-06','2026-11-05'),(3,3,2,'2026-03-16','2027-03-15'),(4,4,7,'2026-06-02','2026-12-01'),(5,5,6,'2026-09-21','2026-10-20'),(6,6,4,'2026-07-11','2026-10-10'),(7,7,5,'2026-10-13','2026-11-12'),(8,8,9,'2026-10-02','2026-11-01'),(9,9,10,'2026-10-04','2026-11-03'),(10,10,8,'2026-01-11','2027-01-10'),(11,11,3,'2026-09-02','2026-10-01'),(12,12,7,'2026-09-16',NULL);
/*!40000 ALTER TABLE `member_workout_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members` (
  `member_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `gender` enum('M','F','O') NOT NULL,
  `dob` date NOT NULL,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `emergency_contact` varchar(15) DEFAULT NULL,
  `join_date` date NOT NULL DEFAULT (curdate()),
  `status` enum('active','expired','suspended') DEFAULT 'active',
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `members_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
INSERT INTO `members` VALUES (1,7,'Aarav Patel','M','1998-04-12','9825010001','aarav.patel@mail.com','Adajan, Surat','9825110001','2026-08-01','active'),(2,8,'Diya Shah','F','2000-09-23','9825010002','diya.shah@mail.com','Vesu, Surat','9825110002','2026-10-05','active'),(3,9,'Rohan Mehta','M','1995-01-30','9825010003','rohan.mehta@mail.com','Piplod, Surat','9825110003','2026-03-15','active'),(4,10,'Isha Desai','F','1992-07-18','9825010004','isha.desai@mail.com','Athwa, Surat','9825110004','2026-06-01','active'),(5,11,'Vivek Joshi','M','2003-11-05','9825010005','vivek.joshi@mail.com','Varachha, Surat','9825110005','2026-09-20','expired'),(6,12,'Anjali Verma','F','2002-02-14','9825010006','anjali.verma@mail.com','Katargam, Surat','9825110006','2026-07-10','expired'),(7,13,'Kunal Trivedi','M','1989-06-27','9825010007','kunal.trivedi@mail.com','Udhna, Surat','9825110007','2026-10-12','active'),(8,14,'Sneha Naik','F','1962-12-09','9825010008','sneha.naik@mail.com','Rander, Surat','9825110008','2026-10-01','active'),(9,15,'Harsh Gandhi','M','1999-08-21','9825010009','harsh.gandhi@mail.com','Citylight, Surat','9825110009','2026-10-03','active'),(10,16,'Pooja Chauhan','F','1994-03-16','9825010010','pooja.chauhan@mail.com','Bhatar, Surat','9825110010','2026-01-10','active'),(11,NULL,'Manish Rana','M','1990-05-02','9825010011','manish.rana@mail.com','Pal, Surat','9825110011','2026-09-01','expired'),(12,NULL,'Riya Parekh','F','2001-10-29','9825010012','riya.parekh@mail.com','Althan, Surat','9825110012','2026-09-15','suspended');
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membership_plans`
--

DROP TABLE IF EXISTS `membership_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membership_plans` (
  `plan_id` int NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(50) NOT NULL,
  `duration_months` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`plan_id`),
  UNIQUE KEY `plan_name` (`plan_name`),
  CONSTRAINT `membership_plans_chk_1` CHECK ((`duration_months` > 0)),
  CONSTRAINT `membership_plans_chk_2` CHECK ((`price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membership_plans`
--

LOCK TABLES `membership_plans` WRITE;
/*!40000 ALTER TABLE `membership_plans` DISABLE KEYS */;
INSERT INTO `membership_plans` VALUES (1,'Monthly',1,1500.00,'1 month full access'),(2,'Quarterly',3,4000.00,'3 months full access'),(3,'Half-Yearly',6,7000.00,'6 months full access'),(4,'Yearly',12,12000.00,'12 months full access'),(5,'Student Monthly',1,1000.00,'Discounted monthly plan for students'),(6,'Student Quarterly',3,2700.00,'Discounted 3 month plan for students'),(7,'Couple Monthly',1,2600.00,'Monthly plan for two people'),(8,'Senior Citizen',1,1200.00,'Monthly plan for 60+ members'),(9,'Weekend Only',1,900.00,'Saturday and Sunday access only'),(10,'Premium Yearly',12,18000.00,'12 months with trainer and steam room');
/*!40000 ALTER TABLE `membership_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `subscription_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL DEFAULT (curdate()),
  `method` enum('cash','card','upi','netbanking') NOT NULL,
  `status` enum('paid','pending','failed') DEFAULT 'paid',
  PRIMARY KEY (`payment_id`),
  KEY `member_id` (`member_id`),
  KEY `subscription_id` (`subscription_id`),
  KEY `idx_pay_date` (`payment_date`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`subscription_id`),
  CONSTRAINT `payments_chk_1` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,1,4000.00,'2026-08-01','upi','paid'),(2,2,2,1500.00,'2026-10-05','card','paid'),(3,3,3,12000.00,'2026-03-15','netbanking','paid'),(4,4,4,7000.00,'2026-06-01','cash','paid'),(5,5,5,1000.00,'2026-09-20','upi','paid'),(6,6,6,2700.00,'2026-07-10','card','paid'),(7,7,7,2600.00,'2026-10-12','upi','paid'),(8,8,8,1200.00,'2026-10-01','cash','paid'),(9,9,9,900.00,'2026-10-03','upi','paid'),(10,10,10,18000.00,'2026-01-10','netbanking','paid'),(11,11,11,1500.00,'2026-09-01','cash','paid'),(12,12,12,4000.00,'2026-09-15','card','failed');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','cancelled') DEFAULT 'active',
  PRIMARY KEY (`subscription_id`),
  KEY `member_id` (`member_id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_sub_end` (`end_date`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  CONSTRAINT `subscriptions_chk_1` CHECK ((`end_date` > `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (1,1,2,'2026-08-01','2026-11-01','active'),(2,2,1,'2026-10-05','2026-11-05','active'),(3,3,4,'2026-03-15','2027-03-15','active'),(4,4,3,'2026-06-01','2026-12-01','active'),(5,5,5,'2026-09-20','2026-10-20','expired'),(6,6,6,'2026-07-10','2026-10-10','expired'),(7,7,7,'2026-10-12','2026-11-12','active'),(8,8,8,'2026-10-01','2026-11-01','active'),(9,9,9,'2026-10-03','2026-11-03','active'),(10,10,10,'2026-01-10','2027-01-10','active'),(11,11,1,'2026-09-01','2026-10-01','expired'),(12,12,2,'2026-09-15','2026-12-15','cancelled');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainer_assignments`
--

DROP TABLE IF EXISTS `trainer_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainer_assignments` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `trainer_id` int NOT NULL,
  `member_id` int NOT NULL,
  `assigned_date` date NOT NULL DEFAULT (curdate()),
  `status` enum('active','ended') DEFAULT 'active',
  PRIMARY KEY (`assignment_id`),
  KEY `trainer_id` (`trainer_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `trainer_assignments_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`trainer_id`),
  CONSTRAINT `trainer_assignments_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainer_assignments`
--

LOCK TABLES `trainer_assignments` WRITE;
/*!40000 ALTER TABLE `trainer_assignments` DISABLE KEYS */;
INSERT INTO `trainer_assignments` VALUES (1,1,1,'2026-08-02','active'),(2,3,2,'2026-10-06','active'),(3,1,3,'2026-03-16','active'),(4,2,4,'2026-06-02','active'),(5,6,5,'2026-09-21','ended'),(6,4,6,'2026-07-11','ended'),(7,5,7,'2026-10-13','active'),(8,9,8,'2026-10-02','active'),(9,10,9,'2026-10-04','active'),(10,8,10,'2026-01-11','active'),(11,4,11,'2026-09-02','ended'),(12,7,12,'2026-09-16','ended');
/*!40000 ALTER TABLE `trainer_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainer_schedules`
--

DROP TABLE IF EXISTS `trainer_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainer_schedules` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `trainer_id` int NOT NULL,
  `day_of_week` enum('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`schedule_id`),
  UNIQUE KEY `trainer_id` (`trainer_id`,`day_of_week`,`start_time`),
  CONSTRAINT `trainer_schedules_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`trainer_id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_schedules_chk_1` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainer_schedules`
--

LOCK TABLES `trainer_schedules` WRITE;
/*!40000 ALTER TABLE `trainer_schedules` DISABLE KEYS */;
INSERT INTO `trainer_schedules` VALUES (1,1,'Mon','06:00:00','12:00:00'),(2,1,'Wed','06:00:00','12:00:00'),(3,2,'Tue','07:00:00','13:00:00'),(4,2,'Thu','07:00:00','13:00:00'),(5,3,'Mon','16:00:00','22:00:00'),(6,3,'Fri','16:00:00','22:00:00'),(7,4,'Tue','06:00:00','11:00:00'),(8,5,'Sat','08:00:00','14:00:00'),(9,6,'Wed','17:00:00','21:00:00'),(10,7,'Sun','08:00:00','12:00:00'),(11,8,'Thu','15:00:00','21:00:00'),(12,9,'Fri','06:00:00','10:00:00');
/*!40000 ALTER TABLE `trainer_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainers`
--

DROP TABLE IF EXISTS `trainers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainers` (
  `trainer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `hire_date` date NOT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`trainer_id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `trainers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `trainers_chk_1` CHECK ((`salary` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainers`
--

LOCK TABLES `trainers` WRITE;
/*!40000 ALTER TABLE `trainers` DISABLE KEYS */;
INSERT INTO `trainers` VALUES (1,2,'Rahul Sharma','9712020001','rahul.sharma@fitbook.com','Strength Training','2023-01-15',32000.00),(2,3,'Priya Nair','9712020002','priya.nair@fitbook.com','Yoga and Flexibility','2023-03-01',30000.00),(3,4,'Amit Singh','9712020003','amit.singh@fitbook.com','Bodybuilding','2022-07-10',35000.00),(4,5,'Neha Kapoor','9712020004','neha.kapoor@fitbook.com','Weight Loss','2024-02-20',28000.00),(5,6,'Karan Malhotra','9712020005','karan.malhotra@fitbook.com','CrossFit','2024-05-05',33000.00),(6,NULL,'Sunil Yadav','9712020006','sunil.yadav@fitbook.com','Cardio','2023-09-12',26000.00),(7,NULL,'Meera Iyer','9712020007','meera.iyer@fitbook.com','Zumba and Aerobics','2024-08-01',27000.00),(8,NULL,'Deepak Rathod','9712020008','deepak.rathod@fitbook.com','Powerlifting','2022-11-18',36000.00),(9,NULL,'Kavita Bhatt','9712020009','kavita.bhatt@fitbook.com','Senior Fitness','2025-01-06',25000.00),(10,NULL,'Arjun Reddy','9712020010','arjun.reddy@fitbook.com','Functional Training','2025-04-14',29000.00);
/*!40000 ALTER TABLE `trainers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','trainer','member') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$12$3lmGXQJQaeT8fMJiGOa/ruBlYyb80hbRQ2MIgRR0.tvAOX.B43FMC','admin','2026-10-24 06:03:06'),(2,'trainer_rahul','$2b$12$AN1.xDxYXI8EDGeJKvy4ieMmfAXSUzRPqq7NvIaopkzZrtnjoktB2','trainer','2026-10-24 06:03:06'),(3,'trainer_priya','$2b$12$d/eztBhHFk4x2HrQ1lsGoupAbmWpY58AeE1E0y6jkKC3v0ihUex7S','trainer','2026-10-24 06:03:06'),(4,'trainer_amit','$2b$12$g441oIJIGxdf1B6EZXzAuOMTZR5EEzuJys3.lnRPfgkrdb3Ic856m','trainer','2026-10-24 06:03:06'),(5,'trainer_neha','$2b$12$vT5PwLpaTWNQJa6N8kDufOMXbQDu8k8vyIeqgvYgtoy1IFgm.iarm','trainer','2026-10-24 06:03:06'),(6,'trainer_karan','$2b$12$3Aw.Dwv/oXNb82XXJCBafuU2E1C9En87w2mOAn5W8VorjYIExCIBO','trainer','2026-10-24 06:03:06'),(7,'member_aarav','$2b$12$oAthFwqmO/WzfMYQirFADOBwc/SJjhCVgbStBXx7XlRex0EdayBha','member','2026-10-24 06:03:06'),(8,'member_diya','$2b$12$1VHCKM7270krGOEOdCsXTuuuRbEV..IsrRfP7nNcAMZEpdMQsqBCi','member','2026-10-24 06:03:06'),(9,'member_rohan','$2b$12$OJyX9IRyc6eflqD5nGXg..zl8VtWtaLv8K9p2hEMnBAHanO3HzwDW','member','2026-10-24 06:03:06'),(10,'member_isha','$2b$12$40.cZCgoViUxJ3guZzp9H.dAhdjrtzL/SYs64IZyMNp0bLhcllbYG','member','2026-10-24 06:03:06'),(11,'member_vivek','$2b$12$LcBL3zF64az5Jq1vLHwOZuM21TxJF4Y9HU3p6h83sk0T.ey8gsKf.','member','2026-10-24 06:03:06'),(12,'member_anjali','$2b$12$aCZ7i51jA2iwafbln1CIaeCVXDVUlfXszFK.LOfAoRnfFmHo7VC5i','member','2026-10-24 06:03:06'),(13,'member_kunal','$2b$12$w4k/jX4gEGpMuYqzkOuWx.Hd.zOktNEjDz85TfscdT06FyQQ2avIq','member','2026-10-24 06:03:06'),(14,'member_sneha','$2b$12$GfTG8tgRliDkGYQSIyhnDed4Iw44LkwhqlL4KHFXqc3i1svZcgcjG','member','2026-10-24 06:03:06'),(15,'member_harsh','$2b$12$1Ym67eO9Zm6vwUgJX58XgOdX7egHhY.iQEqSIjZkdkxnLToQ3o.Ku','member','2026-10-24 06:03:06'),(16,'member_pooja','$2b$12$xAmbte9eJ4qQoknnjYeEDe3Y9utAqiOLoknG8EtBihhuwYX1YsRiK','member','2026-10-24 06:03:06');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_dashboard`
--

DROP TABLE IF EXISTS `v_dashboard`;
/*!50001 DROP VIEW IF EXISTS `v_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_dashboard` AS SELECT 
 1 AS `active_memberships`,
 1 AS `monthly_revenue`,
 1 AS `todays_attendance`,
 1 AS `open_issues`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `workout_plan_exercises`
--

DROP TABLE IF EXISTS `workout_plan_exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workout_plan_exercises` (
  `wpe_id` int NOT NULL AUTO_INCREMENT,
  `workout_plan_id` int NOT NULL,
  `exercise_id` int NOT NULL,
  `day_number` int NOT NULL,
  `sets` int NOT NULL,
  `reps` int NOT NULL,
  PRIMARY KEY (`wpe_id`),
  UNIQUE KEY `workout_plan_id` (`workout_plan_id`,`exercise_id`,`day_number`),
  KEY `exercise_id` (`exercise_id`),
  CONSTRAINT `workout_plan_exercises_ibfk_1` FOREIGN KEY (`workout_plan_id`) REFERENCES `workout_plans` (`workout_plan_id`) ON DELETE CASCADE,
  CONSTRAINT `workout_plan_exercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`exercise_id`),
  CONSTRAINT `workout_plan_exercises_chk_1` CHECK ((`day_number` between 1 and 7)),
  CONSTRAINT `workout_plan_exercises_chk_2` CHECK ((`sets` > 0)),
  CONSTRAINT `workout_plan_exercises_chk_3` CHECK ((`reps` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workout_plan_exercises`
--

LOCK TABLES `workout_plan_exercises` WRITE;
/*!40000 ALTER TABLE `workout_plan_exercises` DISABLE KEYS */;
INSERT INTO `workout_plan_exercises` VALUES (1,1,1,1,3,10),(2,1,2,2,3,12),(3,1,3,3,3,8),(4,2,1,1,5,5),(5,2,3,2,5,5),(6,2,2,3,5,5),(7,3,10,1,1,30),(8,3,12,2,4,15),(9,3,8,3,3,60),(10,4,9,1,4,15),(11,4,11,2,1,40),(12,5,12,1,5,20),(13,5,4,2,4,8),(14,6,10,1,1,45),(15,6,11,3,1,30),(16,7,8,1,4,45),(17,7,9,2,3,12),(18,8,2,1,5,3),(19,8,3,2,5,3),(20,9,8,1,3,30);
/*!40000 ALTER TABLE `workout_plan_exercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workout_plans`
--

DROP TABLE IF EXISTS `workout_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workout_plans` (
  `workout_plan_id` int NOT NULL AUTO_INCREMENT,
  `trainer_id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `goal` enum('weight_loss','muscle_gain','endurance','general') NOT NULL,
  `level` enum('beginner','intermediate','advanced') NOT NULL,
  `created_at` date DEFAULT (curdate()),
  PRIMARY KEY (`workout_plan_id`),
  KEY `trainer_id` (`trainer_id`),
  CONSTRAINT `workout_plans_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`trainer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workout_plans`
--

LOCK TABLES `workout_plans` WRITE;
/*!40000 ALTER TABLE `workout_plans` DISABLE KEYS */;
INSERT INTO `workout_plans` VALUES (1,1,'Beginner Strength Starter','muscle_gain','beginner','2026-01-10'),(2,3,'Mass Builder 5 Day','muscle_gain','advanced','2026-02-12'),(3,4,'Fat Burn Express','weight_loss','beginner','2026-03-05'),(4,4,'Fat Burn Intermediate','weight_loss','intermediate','2026-03-20'),(5,5,'CrossFit Conditioning','endurance','intermediate','2026-04-02'),(6,6,'Cardio Stamina Builder','endurance','beginner','2026-04-18'),(7,2,'Flexibility and Core','general','beginner','2026-05-07'),(8,8,'Powerlifting Basics','muscle_gain','intermediate','2026-05-25'),(9,9,'Senior Fitness Routine','general','beginner','2026-06-10'),(10,10,'Functional Full Body','general','intermediate','2026-07-01');
/*!40000 ALTER TABLE `workout_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `v_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_dashboard` AS select (select count(0) from `subscriptions` where ((`subscriptions`.`status` = 'active') and (`subscriptions`.`end_date` >= curdate()))) AS `active_memberships`,(select coalesce(sum(`payments`.`amount`),0) from `payments` where ((`payments`.`status` = 'paid') and (month(`payments`.`payment_date`) = month(curdate())) and (year(`payments`.`payment_date`) = year(curdate())))) AS `monthly_revenue`,(select count(0) from `attendance` where (cast(`attendance`.`check_in` as date) = curdate())) AS `todays_attendance`,(select count(0) from `maintenance_requests` where (`maintenance_requests`.`status` <> 'resolved')) AS `open_issues` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-24 12:18:54
