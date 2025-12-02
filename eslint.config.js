const js = require("@eslint/js");
const prettier = require("eslint-config-prettier");

module.exports = [
	js.configs.recommended,
	prettier,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
			globals: {
				// Node.js globals
				console: "readonly",
				process: "readonly",
				module: "readonly",
				require: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				Buffer: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
			},
		},
		rules: {
			// Error prevention
			"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"no-console": "off",
			"no-undef": "error",

			// Best practices
			eqeqeq: ["error", "always"],
			curly: ["error", "all"],
			"no-var": "error",
			"prefer-const": "warn",

			// Style (non-formatting, Prettier handles formatting)
			"no-multiple-empty-lines": ["warn", { max: 2 }],
		},
	},
	{
		ignores: ["node_modules/", "images/", "*.json"],
	},
];
