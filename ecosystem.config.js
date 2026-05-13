module.exports = {
  apps: [
    {
      name: 'gastro-pistazz',
      script: '/home/marcio/gastro-pistazz/start.sh',
      interpreter: 'bash',
      cwd: '/home/marcio/gastro-pistazz',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
      // Kill the entire process group so next-server children are also terminated
      kill_timeout: 10000,
      kill_mode: 'process-group',
      restart_delay: 5000,
      max_restarts: 10,
      wait_ready: false,
    },
  ],
}
