async function testAPI() {
  const tests = [
    { url: 'http://localhost:4000/health', method: 'GET' },
    { url: 'http://localhost:4000/health/db', method: 'GET' },
    { 
      url: 'http://localhost:4000/v1/score/transaction', 
      method: 'POST', 
      body: { txn: { type: 'P2P_SEND', sender_wallet: '01711223344', receiver_wallet: '01911778899', amount_bdt: 25000, channel: 'APP', device_id: 'D-01' } } 
    },
    { 
      url: 'http://localhost:4000/v1/scamcheck', 
      method: 'POST', 
      body: { text: 'উপায় হেল্পলাইন থেকে বলছি, আপনার অ্যাকাউন্টের পিন কোড দিন।' } 
    },
    { url: 'http://localhost:4000/v1/campaigns', method: 'GET' },
    { url: 'http://localhost:4000/v1/merchants', method: 'GET' },
    { url: 'http://localhost:4000/v1/complaints', method: 'GET' },
    { url: 'http://localhost:4000/v1/propagation/alerts', method: 'GET' },
    { 
      url: 'http://localhost:4000/v1/score/transaction', 
      method: 'POST', 
      body: { invalid: true } 
    }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: { 'Content-Type': 'application/json' },
        body: t.body ? JSON.stringify(t.body) : undefined
      });
      const data = await res.json();
      console.log(`[STATUS: ${res.status}] ${t.method} ${t.url}`);
      console.log(` -> success: ${data.success}`);
      console.log(` -> message: "${data.message}"`);
      console.log('---');
    } catch (e) {
      console.error(`ERROR: ${t.method} ${t.url} - ${e.message}`);
    }
  }
}

testAPI();
