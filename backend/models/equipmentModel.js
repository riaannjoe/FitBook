const { query } = require('../config/db');
exports.list = ({ status, category }) => {
  const c = [], p = [];
  if (status) { c.push('status=?'); p.push(status); }
  if (category) { c.push('category=?'); p.push(category); }
  return query(`SELECT * FROM equipment ${c.length ? 'WHERE ' + c.join(' AND ') : ''} ORDER BY name`, p);
};
exports.findById = async id => (await query('SELECT * FROM equipment WHERE equipment_id=?', [id]))[0];
exports.create = async b => (await query(
  'INSERT INTO equipment(name,category,purchase_date,cost) VALUES(?,?,?,?)',
  [b.name, b.category, b.purchase_date || null, b.cost ?? null])).insertId;
exports.remove = async id => (await query('DELETE FROM equipment WHERE equipment_id=?', [id])).affectedRows;
exports.UPDATABLE = ['name', 'category', 'purchase_date', 'cost', 'status'];

exports.maintenanceList = ({ status }) => query(
  `SELECT r.*, e.name AS equipment, u.username AS reported_by_name FROM maintenance_requests r
   JOIN equipment e USING(equipment_id) JOIN users u ON u.user_id=r.reported_by
   ${status ? 'WHERE r.status=?' : ''} ORDER BY r.reported_date DESC, r.request_id DESC`, status ? [status] : []);
exports.maintenanceCreate = async (equipmentId, userId, issue) => (await query(
  'INSERT INTO maintenance_requests(equipment_id,reported_by,issue) VALUES(?,?,?)', [equipmentId, userId, issue])).insertId;
exports.maintenanceUpdate = async (id, status, cost) => (await query(
  `UPDATE maintenance_requests SET status=?, repair_cost=?, resolved_date=IF(?='resolved',CURRENT_DATE,NULL) WHERE request_id=?`,
  [status, cost, status, id])).affectedRows;
