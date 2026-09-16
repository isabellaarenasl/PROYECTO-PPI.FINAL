import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

import Bienvenida from './pages/Bienvenida'
import VistaEstudiante from './pages/VistaEstudiante'
import CompletarPerfilEstudiante from './pages/CompletarPerfilEstudiante'
import CompletarPerfil from './pages/CompletarPerfil'
import VerificarEstudiante from './pages/VerificarEstudiante'

import LoginEstudiante from './components/LoginEstudiante'
import Login from './components/Login'
import Navbar from './components/Navbar'

import Inicio from './pages/Inicio'
import Publicaciones from './pages/Publicaciones'
import Mensajes from './pages/Mensajes'
import Perfil from './pages/Perfil'
import Notificaciones from './pages/Notificaciones'

function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargarSesion = async () => {
      const {
        data: { session: sesionActual }
      } = await supabase.auth.getSession()

      setSession(sesionActual)
      setCargando(false)
    }

    cargarSesion()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion)
      setCargando(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (cargando) {
    return (
      <div className="login-background d-flex justify-content-center align-items-center vh-100">
        <div
          className="text-center"
          style={{ color: '#ffffff' }}
        >
          <div
            className="spinner-border text-light"
            role="status"
          >
            <span className="visually-hidden">
              Cargando...
            </span>
          </div>

          <p
            className="mt-3"
            style={{ color: '#ffffff' }}
          >
            Cargando Conéctate Candelaria...
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Bienvenida />} />

        {/* =================================================
                    ESTUDIANTES
                ================================================= */}

        <Route
          path="/estudiantes"
          element={
            session ? (
              <VistaEstudiante />
            ) : (
              <LoginEstudiante />
            )
          }
        />

        <Route
          path="/verificar-estudiante"
          element={
            session ? (
              <VerificarEstudiante />
            ) : (
              <Navigate
                to="/estudiantes"
                replace
              />
            )
          }
        />

        <Route
          path="/completar-perfil-estudiante"
          element={
            session ? (
              <CompletarPerfilEstudiante />
            ) : (
              <Navigate
                to="/estudiantes"
                replace
              />
            )
          }
        />

        {/* =================================================
                    DOCENTES Y PERSONAL AUTORIZADO
                ================================================= */}

        <Route
          path="/acceso-profesores/*"
          element={
            session ? (
              <>
                <Navbar />

                <Routes>
                  <Route
                    path=""
                    element={<Inicio />}
                  />

                  <Route
                    path="publicaciones"
                    element={<Publicaciones />}
                  />

                  <Route
                    path="mensajes"
                    element={<Mensajes />}
                  />

                  <Route
                    path="perfil"
                    element={<Perfil />}
                  />

                  <Route
                    path="notificaciones"
                    element={<Notificaciones />}
                  />
                </Routes>
              </>
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/completar-perfil"
          element={
            session ? (
              <CompletarPerfil />
            ) : (
              <Navigate
                to="/acceso-profesores"
                replace
              />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App