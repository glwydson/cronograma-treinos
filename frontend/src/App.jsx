import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Treinos from './pages/Treinos'
import Circulo from './pages/Circulo'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/treinos" element={<PrivateRoute><Treinos /></PrivateRoute>} />
          <Route path="/circulo" element={<PrivateRoute><Circulo /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/treinos" replace />} />
          <Route path="*" element={<Navigate to="/treinos" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}
