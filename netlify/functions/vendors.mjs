import { execute } from './db.mjs';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    if (event.httpMethod === 'GET') {
      const result = await execute('SELECT * FROM vendors ORDER BY risk_score DESC');
      return { statusCode: 200, headers, body: JSON.stringify({ vendors: result.rows }) };
    }
    if (event.httpMethod === 'POST') {
      const { name, domain, industry } = JSON.parse(event.body);
      const risk_score = Math.floor(Math.random() * 60) + 10;
      const compliance_status = risk_score < 40 ? 'compliant' : risk_score < 70 ? 'partial' : 'non-compliant';
      const financial_health = risk_score < 30 ? 'strong' : risk_score < 60 ? 'moderate' : 'weak';
      const result = await execute(
        "INSERT INTO vendors (name, domain, industry, risk_score, status, compliance_status, financial_health, last_assessed) VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))",
        [name, domain || '', industry || 'General', risk_score, compliance_status, financial_health]
      );
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, vendor_id: result.lastInsertRowid, risk_score }) };
    }
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
