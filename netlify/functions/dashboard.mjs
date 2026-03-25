import { executeMultiple } from './db.mjs';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const results = await executeMultiple([
      { sql: 'SELECT * FROM vendors' },
      { sql: 'SELECT * FROM alerts WHERE is_read = 0' },
      { sql: 'SELECT * FROM risk_reports' },
    ]);
    const [vendorsResult, alertsResult, reportsResult] = results;
    const vendors = vendorsResult.rows;
    const alerts = alertsResult.rows;
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const flaggedVendors = vendors.filter(v => v.status === 'flagged').length;
    const blockedVendors = vendors.filter(v => v.status === 'blocked').length;
    const avgRiskScore = totalVendors > 0 ? Math.round(vendors.reduce((s, v) => s + v.risk_score, 0) / totalVendors) : 0;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    const riskDistribution = {
      low: vendors.filter(v => v.risk_score <= 30).length,
      medium: vendors.filter(v => v.risk_score > 30 && v.risk_score <= 60).length,
      high: vendors.filter(v => v.risk_score > 60 && v.risk_score <= 80).length,
      critical: vendors.filter(v => v.risk_score > 80).length,
    };
    const industries = {};
    vendors.forEach(v => { industries[v.industry] = (industries[v.industry] || 0) + 1; });
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        summary: { totalVendors, activeVendors, flaggedVendors, blockedVendors, avgRiskScore, criticalAlerts, highAlerts, totalReports: reportsResult.rows.length, unreadAlerts: alerts.length },
        riskDistribution, industries,
        recentAlerts: alerts.slice(0, 5),
        topRiskVendors: vendors.filter(v => v.risk_score > 60).sort((a, b) => b.risk_score - a.risk_score),
      }),
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
