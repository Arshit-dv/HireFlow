// ============================================================
// PM2 Ecosystem Configuration for Node.js Backend on AWS EC2
// ============================================================

module.exports = {
  apps: [
    {
      name: 'hr-backend-api',
      script: 'server.js',
      cwd: '/home/ubuntu/app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M', // Safe limit for t2.micro / t3.micro
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
