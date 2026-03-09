# Barber360 - Sistema de Gestão para Barbearias
![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/tests.yml/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)

> Sistema completo de gestão para barbearias com agendamento online, gestão de barbeiros, relatórios e muito mais.

## Project info

**URL**: https://lovable.dev/projects/6cabbfad-6358-4ef0-9c10-9cee7a5d35c8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6cabbfad-6358-4ef0-9c10-9cee7a5d35c8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:
```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>
# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>
# Step 3: Install the necessary dependencies.
npm i
# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend)
- Vitest (Testing)

## 🔒 Security & Monitoring

- **Rate Limiting**: Proteção contra brute force e DDoS
- **Data Sanitization**: Prevenção de XSS e SQL Injection
- **Error Tracking**: Monitoramento completo via Supabase Dashboard (zero custo)
- **Performance Monitoring**: Logs automáticos de operações lentas

Veja [SECURITY.md](./SECURITY.md) e [MONITORING.md](./MONITORING.md) para detalhes.

## ⚡ Performance

- **React Query Cache**: Cache inteligente por tipo de dado (5-30 min staleTime)
- **Database Indexes**: Índices otimizados para todas as queries principais
- **Code Splitting**: Lazy loading de páginas pesadas (Dashboard, Relatórios)
- **Image Optimization**: Componente OptimizedImage com lazy loading nativo
- **Loading States**: Skeletons para feedback visual imediato

Veja [PERFORMANCE.md](./PERFORMANCE.md) para detalhes.

## 🧪 Running Tests
```sh
# Run all tests
npm run test
# Run tests with UI
npm run test:ui
# Run tests with coverage
npm run test:coverage
# Run specific test file
npx vitest __tests__/hooks/useAuth.test.tsx
```

See [TESTING.md](./TESTING.md) for more details.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6cabbfad-6358-4ef0-9c10-9cee7a5d35c8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
