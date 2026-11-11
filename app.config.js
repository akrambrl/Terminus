// Complète app.json. PAGES_BASE_URL sert à publier la version web dans un sous-dossier
// (par défaut, le site est servi à la racine de https://terminusparis.fr).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.PAGES_BASE_URL ? { baseUrl: process.env.PAGES_BASE_URL } : {}),
  },
});
