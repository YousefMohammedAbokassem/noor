module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.BABEL_ENV === "production" || process.env.NODE_ENV === "production";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      isProduction && "transform-remove-console",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
          extensions: [".tsx", ".ts", ".js", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ].filter(Boolean),
  };
};
