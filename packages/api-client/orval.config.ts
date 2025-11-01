export default {
  resumematch: {
    input: "http://localhost:3000/docs-json",
    output: {
      target: "src/api.ts",
      client: "axios",
      prettier: true,
      mode: "single",
    },
  },
} as const;
