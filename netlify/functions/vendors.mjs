import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://vendorvet-majoraaron.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const result = await client.execute('SELECT * FROM vendors ORDER BY risk_score DESC');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ vendors: result.rows }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { name, domain, industry } = body;
      // Simulate AI risk scoring
      const risk_score = Math.floor(Math.random() * 60) + 10;
      const compliance_status = risk_score < 40 ? 'compliant' : risk_score < 70 ? 'partial' : 'non-compliant';
      const financial_health = risk_score < 30 ? 'strong' : risk_score < 60 ? 'moderate' : 'weak';

      const result = await client.execute({
        sql: `INSERT INTO vendors (name, domain, industry, risk_score, status, compliance_status, financial_health, last_assessed)
              VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))`,
        args: [name, domain || '', industry || 'General', risk_score, compliance_status, financial_health],
      });

      // Auto-generate risk reports for new vendor
      const reportTypes = ['security', 'compliance', 'financial', 'reputation'];
      for (const type of reportTypes) {
        const score = Math.floor(Math.random() * 40) + (100 - risk_score - 20);
        await client.execute({
          sql: `INSERT INTO risk_reports (vendor_id, report_type, score, findings, recommendations, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            result.lastInsertRowid,
            type,
            Math.max(5, Math.min(95, score)),
            `Automated ${type} assessment completed for ${name}.`,
            `Review ${type} findings and take appropriate action.`,
          ],
        });
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, vendor_id: Number(result.lastInsertRowid), risk_score }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}
