import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.CODESTRA_GATEWAY_ORIGIN;
  if (target) {
    const url = new URL(target);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(url.hostname))
      )
    ) {
      throw new Error(
        "CODESTRA_GATEWAY_ORIGIN must be an HTTPS gateway origin or loopback test gateway.",
      );
    }
  }
  return {
    server: {
      host: "127.0.0.1",
      proxy: target
        ? {
            "/api/v1/marketing": {
              target,
              changeOrigin: true,
              secure: true,
              followRedirects: false,
            },
          }
        : {},
    },
    build: {
      rollupOptions: {
        output: { manualChunks: { react: ["react", "react-dom"] } },
      },
    },
  };
});
