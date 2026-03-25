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
    const [vendors, alerts, reports] = await Promise.all([
      client.execute('SELECT * FROM vendors'),
      client.execute('SELECT * FROM alerts WHERE is_read = 0'),
      client.execute('SELECT * FROM risk_reports'),
    ]);

    const totalVendors = vendors.rows.length;
    const activeVendors = vendors.rows.filter(v => v.status === 'active').length;
    const flaggedVendors = vendors.rows.filter(v => v.status === 'flagged').length;
    const blockedVendors = vendors.rows.filter(v => v.status === 'blocked').length;
    const avgRiskScore = totalVendors > 0
      ? Math.round(vendors.rows.reduce((sum, v) => sum + v.risk_score, 0) / totalVendors)
      : 0;
    const criticalAlerts = alerts.rows.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.rows.filter(a => a.severity === 'high').length;

    // Risk distribution
    const riskDistribution = {
      low: vendors.rows.filter(v => v.risk_score <= 30).length,
      medium: vendors.rows.filter(v => v.risk_score > 30 && v.risk_score <= 60).length,
      high: vendors.rows.filter(v => v.risk_score > 60 && v.risk_score <= 80).length,
      critical: vendors.rows.filter(v => v.risk_score > 80).length,
    };

    // Industry breakdown
    const industries = {};
    vendors.rows.forEach(v => {
      industries[v.industry] = (industries[v.industry] || 0) + 1;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          totalVendors,
          activeVendors,
          flaggedVendors,
          blockedVendors,
          avgRiskScore,
          criticalAlerts,
          highAlerts,
          totalReports: reports.rows.length,
          unreadAlerts: alerts.rows.length,
        },
        riskDistribution,
        industries,
        recentAlerts: alerts.rows.slice(0, 5),
        topRiskVendors: vendors.rows.filter(v => v.risk_score > 60).sort((a, b) => b.risk_score - a.risk_score),
      }),
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
