import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Journal from './pages/Journal'
import Gym from './pages/Gym'
import Reading from './pages/Reading'
import Calendar from './pages/Calendar'
import Highlights from './pages/Highlights'
import Group from './pages/Group'
import Settings from './pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/journal/today" replace /> },

      { path: 'journal', element: <Navigate to="/journal/today" replace /> },
      { path: 'journal/today', element: <Journal /> },
      { path: 'journal/:date', element: <Journal /> },

      { path: 'gym', element: <Navigate to="/gym/today" replace /> },
      { path: 'gym/today', element: <Gym /> },
      { path: 'gym/:date', element: <Gym /> },

      { path: 'reading', element: <Navigate to="/reading/today" replace /> },
      { path: 'reading/today', element: <Reading /> },
      { path: 'reading/:date', element: <Reading /> },

      { path: 'calendar', element: <Calendar /> },
      { path: 'highlights', element: <Highlights /> },
      { path: 'group', element: <Group /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
])
