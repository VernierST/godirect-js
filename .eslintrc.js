module.exports = {
    "extends": [
      "airbnb-base",
      "plugin:jest/recommended"
    ],
    "plugins": [
      "jest"
    ],
    "env": {
      "browser": true,
      "node": true
    },
    "rules": {
      "linebreak-style": "off",
      "no-prototype-builtins": "off",
      "global-require": "off",
      "import/no-extraneous-dependencies": "off",
      "import/prefer-default-export": "off",
      "import/no-unresolved": "off",
      "import/extensions": "off",
      "max-len": "off",
      "quotes": ["error", "single", { "allowTemplateLiterals": true }],
      "no-plusplus": "off",
      "no-underscore-dangle": "off",
      "comma-dangle": ["error", {
        "arrays": "ignore",
        "objects": "ignore",
        "imports": "never",
        "exports": "never",
        "functions": "ignore"
      }],
      "spaced-comment": ["warn", "always", {
        "exceptions": ["/","+","-"]
      }],
      "no-console": "off",
      "no-debugger": "warn",
      "space-before-function-paren": "off",
      "no-multi-spaces": ["warn", {
        exceptions: {
          "VariableDeclarator": true,
          "Property": true
        }
      }],
      "quote-props": ["error", "as-needed", { "keywords": true, "unnecessary": false }],
      "no-param-reassign": "off",
      "radix": "off",
      "no-shadow": "off",
      "arrow-body-style": "off",
      "class-methods-use-this": "off" // turning this off because of declarative bindings in Polymer these are used a lot
    }
};
