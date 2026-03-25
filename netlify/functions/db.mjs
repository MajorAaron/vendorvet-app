// Lightweight Turso HTTP client - no native deps needed
const DB_URL = (process.env.TURSO_DATABASE_URL || 'libsql://vendorvet-majoraaron.aws-us-east-2.turso.io')
  .replace('libsql://', 'https://');
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

export async function execute(sql, args = []) {
  const stmts = [{ type: 'execute', stmt: { sql, args: args.map(a => ({ type: typeof a === 'number' ? 'integer' : 'text', value: String(a) })) } }, { type: 'close' }];
  const resp = await fetch(`${DB_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: stmts }),
  });
  const data = await resp.json();
  const result = data.results?.[0]?.response?.result;
  if (!result) return { rows: [], lastInsertRowid: null };
  const cols = result.cols.map(c => c.name);
  const rows = (result.rows || []).map(row => {
    const obj = {};
    row.forEach((cell, i) => { obj[cols[i]] = cell.type === 'integer' ? Number(cell.value) : cell.value; });
    return obj;
  });
  return { rows, lastInsertRowid: result.last_insert_rowid ? Number(result.last_insert_rowid) : null };
}

export async function executeMultiple(statements) {
  const stmts = statements.map(s => ({
    type: 'execute',
    stmt: { sql: s.sql, args: (s.args || []).map(a => ({ type: typeof a === 'number' ? 'integer' : 'text', value: String(a) })) }
  }));
  stmts.push({ type: 'close' });
  const resp = await fetch(`${DB_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: stmts }),
  });
  const data = await resp.json();
  return data.results.filter(r => r.type === 'ok' && r.response?.type === 'execute').map(r => {
    const result = r.response.result;
    const cols = result.cols.map(c => c.name);
    const rows = (result.rows || []).map(row => {
      const obj = {};
      row.forEach((cell, i) => { obj[cols[i]] = cell.type === 'integer' ? Number(cell.value) : cell.value; });
      return obj;
    });
    return { rows, lastInsertRowid: result.last_insert_rowid ? Number(result.last_insert_rowid) : null };
  });
}
