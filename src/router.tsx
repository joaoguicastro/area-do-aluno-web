import { createBrowserRouter } from 'react-router-dom';
import Protected from './auth/Protected';
import RoleGuard from './auth/RoleGuard';
import LoginPage from './screens/LoginPage';
import Dashboard from './screens/Dashboard';

import AdminShell from './layouts/AdminShell';
import CursosList from './screens/admin/cursos/CursosList.tsx';

import AlunoShell from './layouts/AlunoShell';
import AlunoHome from './screens/aluno/Home';
import MeusCursos from './screens/aluno/MeusCursos';
import TurmasList from './screens/admin/turmas/TurmasList.tsx';
import AlunosList from './screens/admin/alunos/AlunosList.tsx';
import MatriculasList from './screens/admin/matriculas/MatriculasList.tsx';
import ExerciciosList from './screens/admin/exercicios/ExerciciosList.tsx';
import ProvasList from './screens/admin/provas/ProvasList.tsx';
import VideoAulasPage from './screens/admin/cursos/VideoAulasPage.tsx';
import CursoPlayer from './screens/aluno/cursos/CursoPlayer.tsx';
import FuncionariosPage from './screens/admin/funcionarios/FuncionariosPage.tsx';
import InformativosPage from './screens/admin/informativos/InformativosPage.tsx';
import ModulosPage from './screens/admin/cursos/ModulosPage.tsx';

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
              { path: 'turmas', element: <TurmasList /> },
              { path: 'alunos', element: <AlunosList /> },
              { path: 'matriculas', element: <MatriculasList /> },
              { path: 'exercicios', element: <ExerciciosList /> },
              { path: 'provas', element: <ProvasList /> },
              { path: 'videoaulas', element: <VideoAulasPage /> },
              { path: 'funcionarios', element: <FuncionariosPage /> },
              { path: 'informativos', element: <InformativosPage /> },
              { path: 'modulos', element: <ModulosPage /> },
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
              { path: 'cursos/:cursoId', element: <CursoPlayer /> }
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <LoginPage /> },
]);
