// Complète app.json. PAGES_BASE_URL sert à publier la version web dans un sous-dossier
// (GitHub Pages : https://akrambrl.github.io/Terminus/).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.PAGES_BASE_URL ? { baseUrl: process.env.PAGES_BASE_URL } : {}),
  },
});
