module.exports = {
	apps: [
		{
			name: "mr-gold",
			script: "src/app.ts",
			interpreter: "/usr/local/bin/bun",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
			},
		},
	],
};
