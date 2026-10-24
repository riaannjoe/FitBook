const { query } = require('../config/db');
exports.summary = async () => (await query('SELECT * FROM v_dashboard'))[0];
