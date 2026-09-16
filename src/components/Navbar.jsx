import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function Navbar() {
    const [perfil, setPerfil] = useState(null)
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        const obtenerPerfil = async () => {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            if (!session) {
                return
            }

            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle()

            if (error) {
                console.error('No se pudo cargar el perfil docente:', error)
                return
            }

            if (data) {
                setPerfil(data)
            }

            // Contar notificaciones no leídas
            const { count } = await supabase
                .from('notificaciones')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('leido', false)

            setNotificacionesNoLeidas(count || 0)
        }

        obtenerPerfil()
    }, [])

    const cerrarMenu = () => {
        setMenuAbierto(false)
    }

    const handleCerrarSesion = async () => {
        await supabase.auth.signOut({ scope: 'local' })
        setMenuAbierto(false)
        navigate('/acceso-profesores')
    }

    const enlaceEstaActivo = (ruta) => {
        if (ruta === '/acceso-profesores') {
            return (
                location.pathname === '/acceso-profesores' ||
                location.pathname === '/acceso-profesores/'
            )
        }

        return location.pathname === ruta
    }

    const fotoPerfil =
        perfil?.foto_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            perfil?.nombre || 'Docente'
        )}&background=5b9bd5&color=fff`

    return (
        <nav className="navbar navbar-dark navbar-gradient">
            <div className="container-fluid">
                <Link
                    className="navbar-brand d-flex align-items-center"
                    to="/acceso-profesores"
                    onClick={cerrarMenu}
                >
                    <img
                        src="/lo.png"
                        alt="Logo de Conéctate Candelaria"
                        style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'contain',
                            marginRight: '10px'
                        }}
                    />

                    <span>CONÉCTATE CANDELARIA</span>
                </Link>

                {/* Botón hamburguesa con puntito rojo */}
                <button
                    className="navbar-toggler position-relative"
                    type="button"
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    aria-expanded={menuAbierto}
                    aria-label="Abrir menú"
                >
                    <span className="navbar-toggler-icon"></span>

                    {notificacionesNoLeidas > 0 && (
                        <span
                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                            style={{
                                fontSize: '0.65rem',
                                padding: '0.25em 0.45em',
                                minWidth: '18px'
                            }}
                        >
                            {notificacionesNoLeidas > 9
                                ? '9+'
                                : notificacionesNoLeidas}
                            <span className="visually-hidden">
                                notificaciones no leídas
                            </span>
                        </span>
                    )}
                </button>
            </div>

            {menuAbierto && (
                <div
                    className="w-100 py-3 px-3"
                    style={{
                        background: 'rgba(15, 40, 70, 0.98)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)'
                    }}
                >
                    <div
                        className="d-grid gap-2 mx-auto"
                        style={{ maxWidth: '340px' }}
                    >
                        <Link
                            className={`btn text-start ${enlaceEstaActivo('/acceso-profesores')
                                ? 'btn-light'
                                : 'btn-outline-light'
                                }`}
                            to="/acceso-profesores"
                            onClick={cerrarMenu}
                        >
                            🏠 Inicio
                        </Link>

                        <Link
                            className={`btn text-start ${enlaceEstaActivo(
                                '/acceso-profesores/publicaciones'
                            )
                                ? 'btn-light'
                                : 'btn-outline-light'
                                }`}
                            to="/acceso-profesores/publicaciones"
                            onClick={cerrarMenu}
                        >
                            📄 Publicaciones
                        </Link>

                        <Link
                            className={`btn text-start ${enlaceEstaActivo(
                                '/acceso-profesores/mensajes'
                            )
                                ? 'btn-light'
                                : 'btn-outline-light'
                                }`}
                            to="/acceso-profesores/mensajes"
                            onClick={cerrarMenu}
                        >
                            💬 Mensajes
                        </Link>

                        <Link
                            className={`btn text-start ${enlaceEstaActivo(
                                '/acceso-profesores/notificaciones'
                            )
                                ? 'btn-light'
                                : 'btn-outline-light'
                                }`}
                            to="/acceso-profesores/notificaciones"
                            onClick={cerrarMenu}
                        >
                            🔔 Notificaciones
                            {notificacionesNoLeidas > 0 && (
                                <span className="badge bg-danger ms-2">
                                    {notificacionesNoLeidas}
                                </span>
                            )}
                        </Link>

                        <Link
                            className={`btn text-start ${enlaceEstaActivo(
                                '/acceso-profesores/perfil'
                            )
                                ? 'btn-light'
                                : 'btn-outline-light'
                                }`}
                            to="/acceso-profesores/perfil"
                            onClick={cerrarMenu}
                        >
                            👤 Mi perfil
                        </Link>

                        <div
                            className="d-flex align-items-center p-3 mt-2"
                            style={{
                                background: 'rgba(255, 255, 255, 0.10)',
                                borderRadius: '12px',
                                color: '#ffffff'
                            }}
                        >
                            <img
                                src={fotoPerfil}
                                alt="Foto de perfil del docente"
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    marginRight: '12px',
                                    border: '2px solid rgba(255, 255, 255, 0.45)'
                                }}
                            />

                            <div>
                                <strong>
                                    {perfil?.nombre || 'Docente'}
                                </strong>
                                <br />
                                <small>
                                    {perfil?.rol ||
                                        perfil?.materia ||
                                        'Personal institucional'}
                                </small>
                            </div>
                        </div>

                        <button
                            className="btn btn-outline-light text-start mt-1"
                            onClick={handleCerrarSesion}
                        >
                            🚪 Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar