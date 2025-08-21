module.exports = {
  apps: [
    {
      name: "robotos-rumble-server",
      script: "./dist/index.js",
      time: true,
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};