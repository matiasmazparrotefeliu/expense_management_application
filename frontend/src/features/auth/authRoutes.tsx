import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Login } from './Login';
import { Register } from './Register';
import { ProtectedRoute } from './ProtectedRoute';
import { Dashboard } from './Dashboard';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
