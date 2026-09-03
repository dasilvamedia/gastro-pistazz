// pm2-Konfiguration fuer den Live-Server.
// Cluster mit 2 Instanzen: eine blockierende Anfrage (Geocode, grosser
// Upload) legt nicht mehr die ganze App lahm, und `pm2 reload` wechselt ohne
// Downtime. RAM-Budget: ~2 x 600 MB. Kein start.sh mehr (Bash-Skripte
// koennen nicht im Cluster-Modus laufen).
module.exports = {
  apps: [
    {
      name: 'gastro-pistazz',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      cwd: '/home/marcio/gastro-pistazz',
      exec_mode: 'cluster',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
      node_args: '--max-old-space-size=1024',
      max_memory_restart: '1200M',
      kill_timeout: 10000,
      listen_timeout: 15000,
      restart_delay: 5000,
      max_restarts: 10,
      wait_ready: false,
    },
  ],
}
