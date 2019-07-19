const babelConfig = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "chrome": "58",
          "ie": "6"
        }
      }
    ]
  ]
};

module.exports = babelConfig;