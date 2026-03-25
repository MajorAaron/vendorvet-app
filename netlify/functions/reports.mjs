import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://vendorvet-majoraaron.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const vendorId = event.queryStringParameters?.vendor_id;

    let result;
    if (vendorId) {
      result = await client.execute({
        sql: `SELECT r.*, v.name as vendor_name FROM risk_reports r
              JOIN vendors v ON r.vendor_id = v.id
              WHERE r.vendor_id = ? ORDER BY r.created_at DESC`,
        args: [parseInt(vendorId)],
      });
    } else {
      result = await client.execute(
        `SELECT r.*, v.name as vendor_name FROM risk_reports r
         JOIN vendors v ON r.vendor_id = v.id
         ORDER BY r.created_at DESC LIMIT 50`
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reports: result.rows }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
