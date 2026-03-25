import { execute } from './db.mjs';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const result = await execute(
      "SELECT a.*, v.name as vendor_name FROM alerts a JOIN vendors v ON a.vendor_id = v.id ORDER BY CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, a.created_at DESC"
    );
    return { statusCode: 200, headers, body: JSON.stringify({ alerts: result.rows }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
