import { defineConfig } from 'astro/config';

// Nur lokal: /admin führt direkt ins Redaktionssystem (public/admin/index.html).
const redaktionLokal = {
  name: 'redaktion-lokal',
  hooks: {
    'astro:server:setup': ({ server }) => {
      server.middlewares.use((req, res, next) => {
        const pfad = (req.url ?? '').split('?')[0];
        if (pfad === '/admin' || pfad === '/admin/') {
          res.statusCode = 302;
          res.setHeader('Location', '/admin/index.html');
          res.end();
          return;
        }
        next();
      });
    },
  },
};

export default defineConfig({
  server: { port: 4321 },
  devToolbar: { enabled: false },
  integrations: [redaktionLokal],
});
