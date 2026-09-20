import { createRoot } from 'react-dom/client';
import { AuthProvider } from './features/auth/AuthProvider';
import { AppRouter } from './features/auth/authRoutes';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);
