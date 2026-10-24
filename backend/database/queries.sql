USE fitbook;
-- 1. JOIN: members with active plan and expiry
SELECT m.member_id, m.full_name, p.plan_name, s.end_date
FROM members m JOIN subscriptions s ON s.member_id=m.member_id AND s.status='active'
JOIN membership_plans p ON p.plan_id=s.plan_id ORDER BY s.end_date;

-- 2. Renewals due in next 7 days
SELECT m.full_name, m.phone, s.end_date FROM subscriptions s JOIN members m USING(member_id)
WHERE s.status='active' AND s.end_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY);

-- 3. AGGREGATE: monthly revenue report
SELECT DATE_FORMAT(payment_date,'%Y-%m') AS month, COUNT(*) AS txns, SUM(amount) AS revenue
FROM payments WHERE status='paid' GROUP BY month ORDER BY month DESC;

-- 4. Revenue by plan
SELECT p.plan_name, COUNT(*) AS sold, SUM(pay.amount) AS revenue
FROM payments pay JOIN subscriptions s USING(subscription_id) JOIN membership_plans p USING(plan_id)
WHERE pay.status='paid' GROUP BY p.plan_name ORDER BY revenue DESC;

-- 5. Attendance pattern by hour of day
SELECT HOUR(check_in) AS hr, COUNT(*) AS visits FROM attendance GROUP BY hr ORDER BY visits DESC;

-- 6. Attendance pattern by weekday
SELECT DAYNAME(check_in) AS day, COUNT(*) AS visits FROM attendance GROUP BY day, DAYOFWEEK(check_in) ORDER BY DAYOFWEEK(check_in);

-- 7. Average visit duration per member
SELECT m.full_name, ROUND(AVG(TIMESTAMPDIFF(MINUTE,check_in,check_out)),1) AS avg_minutes
FROM attendance a JOIN members m USING(member_id) WHERE check_out IS NOT NULL GROUP BY m.member_id;

-- 8. Clients per trainer (LEFT JOIN + HAVING)
SELECT t.full_name, COUNT(ta.member_id) AS clients FROM trainers t
LEFT JOIN trainer_assignments ta ON ta.trainer_id=t.trainer_id AND ta.status='active'
GROUP BY t.trainer_id HAVING clients >= 0 ORDER BY clients DESC;

-- 9. Full workout plan of a member
SELECT m.full_name, wp.title, wpe.day_number, e.name, wpe.sets, wpe.reps
FROM member_workout_plans mwp JOIN members m USING(member_id)
JOIN workout_plans wp USING(workout_plan_id) JOIN workout_plan_exercises wpe USING(workout_plan_id)
JOIN exercises e USING(exercise_id) WHERE m.member_id=1 ORDER BY wpe.day_number;

-- 10. Members who never attended in last 30 days (subquery)
SELECT full_name FROM members WHERE member_id NOT IN
 (SELECT member_id FROM attendance WHERE check_in >= DATE_SUB(NOW(), INTERVAL 30 DAY));

-- 11. Equipment with most repair cost
SELECT e.name, COUNT(*) AS issues, SUM(r.repair_cost) AS total_cost
FROM maintenance_requests r JOIN equipment e USING(equipment_id) GROUP BY e.equipment_id ORDER BY total_cost DESC;

-- 12. Dashboard & transaction call
SELECT * FROM v_dashboard;
CALL sp_subscribe(1, 2, 'upi');
