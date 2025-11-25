const http = require('http');

function httpGet(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      res.resume();
      res.on('end', () => {
        resolve({ status: res.statusCode, ms: Date.now() - start });
      });
    });
    req.on('error', (err) => {
      resolve({ error: err.message, ms: Date.now() - start });
    });
  });
}

async function runLoad({ url, requests }) {
  const jobs = Array.from({ length: requests }, () => httpGet(url));
  const results = await Promise.all(jobs);
  const latencies = results.map(r => r.ms);
  const errors = results.filter(r => r.error);
  const statuses = results.map(r => r.status).reduce((acc, s) => { acc[s] = (acc[s]||0)+1; return acc; }, {});
  const sum = latencies.reduce((a,b)=>a+b,0);
  const avg = latencies.length ? (sum/latencies.length) : 0;
  const p95 = latencies.sort((a,b)=>a-b)[Math.floor(latencies.length*0.95)-1] || 0;
  const p99 = latencies.sort((a,b)=>a-b)[Math.floor(latencies.length*0.99)-1] || 0;

  return {
    url,
    requests,
    avgMs: Math.round(avg),
    p95Ms: Math.round(p95),
    p99Ms: Math.round(p99),
    errors: errors.length,
    statusCounts: statuses
  };
}

(async () => {
  const targets = [
    { url: 'http://localhost:5000/', requests: 200 },
    { url: 'http://localhost:5000/api/health', requests: 200 }
  ];

  for (const t of targets) {
    const r = await runLoad(t);
    console.log(JSON.stringify(r));
  }
})();

