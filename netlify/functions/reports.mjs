import { execute } from './db.mjs';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const vendorId = event.queryStringParameters?.vendor_id;
    let result;
    if (vendorId) {
      result = await execute(
        'SELECT r.*, v.name as vendor_name FROM risk_reports r JOIN vendors v ON r.vendor_id = v.id WHERE r.vendor_id = ? ORDER BY r.created_at DESC',
        [parseInt(vendorId)]
      );
    } else {
      result = await execute(
        'SELECT r.*, v.name as vendor_name FROM risk_reports r JOIN vendors v ON r.vendor_id = v.id ORDER BY r.created_at DESC LIMIT 50'
      );
    }
    return { statusCode: 200, headers, body: JSON.stringify({ reports: result.rows }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
