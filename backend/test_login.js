const fetch = require('node-fetch');
(async () => {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'student', identifier: 'STU2024001', password: 'Student@123' })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Data:', data);
})();
