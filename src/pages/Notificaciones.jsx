import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function Notificaciones() {
    const [notificaciones, setNotificaciones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        cargarNotificaciones()
    }, [])

    const cargarNotificaciones = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó.')
            setCargando(false)
            return
        }

        const { data, error: errorNotif } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (errorNotif) {
            console.error(errorNotif)
            setError('No se pudieron cargar las notificaciones.')
            setCargando(false)
            return
        }

        setNotificaciones(data || [])
        setCargando(false)
    }

    const marcarComoLeida = async (id) => {
        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('id', id)

        setNotificaciones((prev) =>
            prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
        )
    }

    const marcarTodasLeidas = async () => {
        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) return

        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('user_id', session.user.id)
            .eq('leido', false)

        setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    }

    const irAEnlace = (notif) => {
        if (!notif.leido) {
            marcarComoLeida(notif.id)
        }
        if (notif.enlace_destino) {
            navigate(notif.enlace_destino)
        }
    }

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(fecha))
    }

    const noLeidas = notificaciones.filter((n) => !n.leido).length

    return (
        <div className="container py-4 pb-5">
            <div
                className="mb-4 p-4"
                style={{
                    background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.97), rgba(91, 155, 213, 0.90))',
                    borderRadius: '20px'
                }}
            >
                <h1 style={{ color: '#ffffff', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    NOTIFICACIONES
                </h1>
                <p className="mb-0" style={{ color: '#ffffff', opacity: 0.92 }}>
                    Aquí aparecen los avisos importantes de la plataforma.
                </p>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">
                    {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todas leídas'}
                </h4>
                {noLeidas > 0 && (
                    <button className="btn btn-outline-primary btn-sm" onClick={marcarTodasLeidas}>
                        Marcar todas como leídas
                    </button>
                )}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {cargando && (
                <div className="text-center py-5">
                    <div className="spinner-border" style={{ color: '#1e3a5f' }} role="status" />
                    <p className="mt-3">Cargando notificaciones...</p>
                </div>
            )}

            {!cargando && notificaciones.length === 0 && (
                <div className="card text-center p-5" style={{ borderRadius: '18px' }}>
                    <div style={{ fontSize: '3rem' }}>🔔</div>
                    <h4 className="mt-3">No tienes notificaciones</h4>
                    <p className="mb-0 text-muted">Cuando haya novedades aparecerán aquí.</p>
                </div>
            )}

            {!cargando &&
                notificaciones.map((notif) => (
                    <article
                        key={notif.id}
                        className="card mb-3"
                        style={{
                            borderRadius: '16px',
                            borderLeft: notif.leido ? '5px solid #94a3b8' : '5px solid #0d6efd',
                            background: notif.leido ? '#ffffff' : '#f0f7ff',
                            cursor: notif.enlace_destino ? 'pointer' : 'default'
                        }}
                        onClick={() => irAEnlace(notif)}
                    >
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex justify-content-between gap-3">
                                <div>
                                    <strong style={{ color: '#1e3a5f' }}>
                                        {notif.titulo || notif.tipo || 'Notificación'}
                                    </strong>
                                    {notif.mensaje && (
                                        <p className="mb-1 mt-1" style={{ color: '#334155' }}>
                                            {notif.mensaje}
                                        </p>
                                    )}
                                    <small className="text-muted">{formatearFecha(notif.created_at)}</small>
                                </div>
                                {!notif.leido && (
                                    <span className="badge bg-primary" style={{ height: 'fit-content' }}>
                                        Nueva
                                    </span>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
        </div>
    )
}

export default Notificaciones