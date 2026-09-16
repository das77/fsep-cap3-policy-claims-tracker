import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Claims from './pages/Claims'
import ClaimDetail from './pages/ClaimDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <Claims />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/:id"
        element={
          <ProtectedRoute>
            <ClaimDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}

export default App
