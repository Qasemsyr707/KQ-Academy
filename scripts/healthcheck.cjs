'use strict';

fetch('http://127.0.0.1:3000/login', {
  redirect: 'manual',
  signal: AbortSignal.timeout(8000)
})
  .then(response => {
    if (response.status !== 200) {
      console.error('Healthcheck failed:', response.status);
      process.exitCode = 1;
    }
  })
  .catch(error => {
    console.error('Healthcheck failed:', error.message);
    process.exitCode = 1;
  });
