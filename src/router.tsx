import { createBrowserRouter } from 'react-router-dom';
import Protected from './auth/Protected';
import RoleGuard from './auth/RoleGuard';
import LoginPage from './screens/LoginPage';
import Dashboard from './screens/Dashboard';

import AdminShell from './layouts/AdminShell';
import CursosList from './screens/cursos/CursosList.tsx';

import AlunoShell from './layouts/AlunoShell';
import AlunoHome from './screens/aluno/Home';
import MeusCursos from './screens/aluno/MeusCursos';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    element: <Protected />,
    children: [
      // ADMIN
      {
        element: <RoleGuard allow={['MASTER','ADMIN','FUNCIONARIO']} />,
        children: [
          {
            path: '/admin',
            element: <AdminShell />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'cursos', element: <CursosList /> },
            ],
          },
        ],
      },

      // ALUNO
      {
        element: <RoleGuard allow={['ALUNO']} />,
        children: [
          {
            path: '/aluno',
            element: <AlunoShell />,
            children: [
              { index: true, element: <AlunoHome /> },
              { path: 'cursos', element: <MeusCursos /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <LoginPage /> },
]);
