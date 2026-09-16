import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Inicio from './Inicio'

function VistaEstudiante() {
    const [seccion, setSeccion] = useState('inicio')
    const [fechaBusqueda, setFechaBusqueda] = useState('')
    const [menuAbierto, setMenuAbierto] = useState(false)

    const [perfil, setPerfil] = useState(null)
    const [cargandoPerfil, setCargandoPerfil] = useState(true)
    const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0)
    const [notificaciones, setNotificaciones] = useState([])
    const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false)

    const [destinatarios, setDestinatarios] = useState([])
    const [destinatarioId, setDestinatarioId] = useState('')
    const [mensajeInicial, setMensajeInicial] = useState('')
    const [mensajesEnviados, setMensajesEnviados] = useState([])
    const [cargandoMensajes, setCargandoMensajes] = useState(false)
    const [enviandoMensaje, setEnviandoMensaje] = useState(false)
    const [errorMensajes, setErrorMensajes] = useState('')
    const [advertenciaContenido, setAdvertenciaContenido] = useState('')
    const [conversacionAbierta, setConversacionAbierta] = useState(null)
    const [mensajesChat, setMensajesChat] = useState([])
    const [nuevoMensajeChat, setNuevoMensajeChat] = useState('')
    const [enviandoChat, setEnviandoChat] = useState(false)
    const [cargandoChat, setCargandoChat] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        cargarPerfil()
        cargarDestinatarios()
        cargarConversaciones()
    }, [])

    useEffect(() => {
        const canal = supabase
            .channel('chat-estudiante-mensajes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mensajes_chat'
                },
                () => {
                    cargarConversaciones()
                    if (conversacionAbierta) {
                        cargarMensajesChat(conversacionAbierta.id)
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'mensajes'
                },
                () => {
                    cargarConversaciones()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(canal)
        }
    }, [conversacionAbierta])

    const cargarPerfil = async () => {
        setCargandoPerfil(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            navigate('/estudiantes', { replace: true })
            return
        }

        const { data, error } = await supabase
            .from('estudiantes')
            .select('id, nombre, grado, email, primera_vez')
            .eq('id', session.user.id)
            .maybeSingle()

        if (error) {
            console.error('No fue posible cargar el perfil:', error)
            setCargandoPerfil(false)
            return
        }

        if (!data) {
            navigate('/completar-perfil-estudiante', { replace: true })
            return
        }

        const perfilIncompleto =
            !data.nombre ||
            data.nombre === 'Usuario anónimo' ||
            !data.grado ||
            data.grado === 'Sin especificar' ||
            data.primera_vez === true

        if (perfilIncompleto) {
            navigate('/completar-perfil-estudiante', { replace: true })
            return
        }

        setPerfil(data)
        setCargandoPerfil(false)

        // Contar notificaciones no leídas
        const { count } = await supabase
            .from('notificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('leido', false)

        setNotificacionesNoLeidas(count || 0)
    }

    const cargarNotificaciones = async () => {
        setCargandoNotificaciones(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setCargandoNotificaciones(false)
            return
        }

        const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
        } else {
            setNotificaciones(data || [])
        }

        setCargandoNotificaciones(false)
    }

    const marcarComoLeida = async (id) => {
        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('id', id)

        setNotificaciones((prev) =>
            prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
        )

        setNotificacionesNoLeidas((prev) => Math.max(0, prev - 1))
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
        setNotificacionesNoLeidas(0)
    }

    const cargarDestinatarios = async () => {
        const { data, error } = await supabase
            .from('perfiles')
            .select('id, nombre, materia, rol, foto_url')
            .order('nombre', { ascending: true })

        if (error) {
            console.error(error)
            setErrorMensajes('No fue posible cargar la lista de destinatarios.')
            return
        }

        setDestinatarios(data || [])
    }

    const cargarConversaciones = async () => {
        setCargandoMensajes(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setErrorMensajes('Tu sesión terminó. Inicia sesión nuevamente.')
            setCargandoMensajes(false)
            return
        }

        const { data, error } = await supabase
            .from('mensajes')
            .select(`
                id,
                destinatario_id,
                contenido,
                contenido_censurado,
                estado,
                estado_revision,
                tiene_contenido_delicado,
                created_at,
                perfiles!mensajes_destinatario_id_fkey (
                    id,
                    nombre,
                    materia,
                    rol,
                    foto_url
                )
            `)
            .eq('estudiante_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            setErrorMensajes(`No fue posible cargar tus conversaciones: ${error.message}`)
            setCargandoMensajes(false)
            return
        }

        setMensajesEnviados(data || [])
        setCargandoMensajes(false)
    }

    const cargarMensajesChat = async (mensajeId) => {
        setCargandoChat(true)

        const { data, error } = await supabase
            .from('mensajes_chat')
            .select(`
                id,
                mensaje_id,
                remitente_tipo,
                docente_id,
                contenido,
                created_at,
                perfiles!mensajes_chat_docente_id_fkey (
                    id,
                    nombre,
                    materia,
                    rol,
                    foto_url
                )
            `)
            .eq('mensaje_id', mensajeId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error(error)
            setErrorMensajes(`No fue posible cargar el chat: ${error.message}`)
            setCargandoChat(false)
            return
        }

        setMensajesChat(data || [])
        setCargandoChat(false)
    }

    const revisarContenidoAntesDeEnviar = (texto) => {
        const textoNormalizado = texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        const palabrasDelicadas = [
            'hpta', 'hijueputa', 'malparido', 'gonorrea', 'marica', 'puta',
            'perra', 'idiota', 'imbecil', 'suicidio', 'matarme', 'quiero morir',
            'violacion', 'abusar', 'acoso', 'porno', 'nudes'
        ]

        const palabraEncontrada = palabrasDelicadas.find((palabra) =>
            textoNormalizado.includes(palabra)
        )

        if (!palabraEncontrada) return ''

        return 'Tu mensaje contiene una palabra o tema que puede ser delicado. Será enviado de forma anónima y podría requerir revisión antes de que el docente vea el contenido completo.'
    }

    const enviarMensajeInicial = async (e) => {
        e.preventDefault()
        setErrorMensajes('')

        const textoLimpio = mensajeInicial.trim()

        if (!destinatarioId) {
            setErrorMensajes('Selecciona a qué docente o personal deseas enviar el mensaje.')
            return
        }

        if (!textoLimpio) {
            setErrorMensajes('Escribe un mensaje antes de enviarlo.')
            return
        }

        setEnviandoMensaje(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setErrorMensajes('Tu sesión terminó. Inicia sesión nuevamente.')
            setEnviandoMensaje(false)
            return
        }

        const { data: mensajeCreado, error } = await supabase
            .from('mensajes')
            .insert({
                estudiante_id: session.user.id,
                destinatario_id: destinatarioId,
                contenido: textoLimpio
            })
            .select(`
                id,
                destinatario_id,
                contenido,
                contenido_censurado,
                estado,
                estado_revision,
                tiene_contenido_delicado,
                created_at,
                perfiles!mensajes_destinatario_id_fkey (
                    id,
                    nombre,
                    materia,
                    rol,
                    foto_url
                )
            `)
            .single()

        if (error) {
            console.error(error)
            setErrorMensajes(`No fue posible enviar el mensaje: ${error.message}`)
            setEnviandoMensaje(false)
            return
        }

        setMensajeInicial('')
        setDestinatarioId('')
        setAdvertenciaContenido('')
        setEnviandoMensaje(false)

        await cargarConversaciones()

        if (mensajeCreado) {
            abrirConversacion(mensajeCreado)
        }
    }

    const abrirConversacion = async (conversacion) => {
        setConversacionAbierta(conversacion)
        setNuevoMensajeChat('')
        setErrorMensajes('')
        await cargarMensajesChat(conversacion.id)
    }

    const cerrarConversacion = () => {
        setConversacionAbierta(null)
        setMensajesChat([])
        setNuevoMensajeChat('')
    }

    const enviarMensajeChat = async (e) => {
        e.preventDefault()
        setErrorMensajes('')

        const textoLimpio = nuevoMensajeChat.trim()

        if (!conversacionAbierta) {
            setErrorMensajes('Abre una conversación antes de enviar un mensaje.')
            return
        }

        if (!textoLimpio) {
            setErrorMensajes('Escribe un mensaje antes de enviarlo.')
            return
        }

        setEnviandoChat(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setErrorMensajes('Tu sesión terminó. Inicia sesión nuevamente.')
            setEnviandoChat(false)
            return
        }

        const { error: errorEnviar } = await supabase
            .from('mensajes_chat')
            .insert({
                mensaje_id: conversacionAbierta.id,
                remitente_tipo: 'estudiante',
                docente_id: null,
                contenido: textoLimpio
            })

        if (errorEnviar) {
            console.error(errorEnviar)
            setErrorMensajes(`No fue posible enviar tu mensaje: ${errorEnviar.message}`)
            setEnviandoChat(false)
            return
        }

        const { error: errorActualizarEstado } = await supabase
            .from('mensajes')
            .update({ estado: 'enviado' })
            .eq('id', conversacionAbierta.id)
            .eq('estudiante_id', session.user.id)

        if (errorActualizarEstado) {
            console.warn('El mensaje se envió, pero no se pudo actualizar el estado:', errorActualizarEstado)
        }

        setNuevoMensajeChat('')
        setEnviandoChat(false)

        await cargarMensajesChat(conversacionAbierta.id)
        await cargarConversaciones()
    }

    const handleCerrarSesion = async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) console.error('Error al cerrar sesión:', error)
        navigate('/estudiantes', { replace: true })
    }

    const cambiarSeccion = (nuevaSeccion) => {
        setSeccion(nuevaSeccion)
        setMenuAbierto(false)

        if (nuevaSeccion === 'mensajes') {
            setErrorMensajes('')
            cargarDestinatarios()
            cargarConversaciones()
        }

        if (nuevaSeccion === 'notificaciones') {
            cargarNotificaciones()
        }
    }

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(fecha))
    }

    const obtenerEtiquetaDestinatario = (destinatario) => {
        if (!destinatario) return 'Personal institucional'
        const descripcion = destinatario.materia || destinatario.rol || 'Personal institucional'
        return `${destinatario.nombre || 'Sin nombre'} · ${descripcion}`
    }

    const textoEstado = (estado) => {
        if (estado === 'respondido') return 'Respondido'
        if (estado === 'leido') return 'Leído'
        return 'Nuevo'
    }

    const claseEstado = (estado) => {
        if (estado === 'respondido') return 'bg-success'
        if (estado === 'leido') return 'bg-primary'
        return 'bg-secondary'
    }

    const nombreEstudiante = perfil?.nombre || 'Estudiante'
    const gradoEstudiante = perfil?.grado || 'Grado sin especificar'
    const fotoEstudiante = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        nombreEstudiante
    )}&background=5b9bd5&color=fff`

    return (
        <div className="min-vh-100 d-flex flex-column">
            <nav className="navbar navbar-dark navbar-gradient">
                <div className="container-fluid">
                    <Link
                        className="navbar-brand d-flex align-items-center"
                        to="/estudiantes"
                        onClick={() => cambiarSeccion('inicio')}
                    >
                        <img
                            src="/logo.png"
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
                                {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
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
                            <button
                                className={`btn text-start ${seccion === 'inicio' ? 'btn-light' : 'btn-outline-light'}`}
                                onClick={() => cambiarSeccion('inicio')}
                            >
                                🏠 Inicio
                            </button>

                            <button
                                className={`btn text-start ${seccion === 'publicaciones' ? 'btn-light' : 'btn-outline-light'}`}
                                onClick={() => cambiarSeccion('publicaciones')}
                            >
                                📄 Publicaciones
                            </button>

                            <button
                                className={`btn text-start ${seccion === 'mensajes' ? 'btn-light' : 'btn-outline-light'}`}
                                onClick={() => cambiarSeccion('mensajes')}
                            >
                                💬 Mensajes
                            </button>

                            <button
                                className={`btn text-start d-flex justify-content-between align-items-center ${seccion === 'notificaciones' ? 'btn-light' : 'btn-outline-light'}`}
                                onClick={() => cambiarSeccion('notificaciones')}
                            >
                                <span>🔔 Notificaciones</span>
                                {notificacionesNoLeidas > 0 && (
                                    <span className="badge bg-danger">{notificacionesNoLeidas}</span>
                                )}
                            </button>

                            <div
                                className="d-flex align-items-center p-3 mt-2"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.10)',
                                    borderRadius: '12px',
                                    color: '#ffffff'
                                }}
                            >
                                <img
                                    src={fotoEstudiante}
                                    alt="Perfil del estudiante"
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        marginRight: '12px',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div>
                                    <strong>
                                        {cargandoPerfil ? 'Cargando perfil...' : nombreEstudiante}
                                    </strong>
                                    <br />
                                    <small>
                                        {cargandoPerfil
                                            ? 'Estudiante'
                                            : `Estudiante · ${gradoEstudiante}`}
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

            <main className="flex-grow-1">
                {seccion === 'inicio' && (
                    <Inicio
                        onIrA={cambiarSeccion}
                        onCerrarSesion={handleCerrarSesion}
                        fechaBusqueda={fechaBusqueda}
                        setFechaBusqueda={setFechaBusqueda}
                    />
                )}

                {seccion === 'publicaciones' && (
                    <div className="container py-4">
                        <h1>PUBLICACIONES</h1>
                        <p>
                            Consulta el Inicio para ver las publicaciones,
                            usar el buscador y dejar reacciones.
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => cambiarSeccion('inicio')}
                        >
                            Ver publicaciones
                        </button>
                    </div>
                )}

                {/* ==================== NOTIFICACIONES ==================== */}
                {seccion === 'notificaciones' && (
                    <div className="container py-4 pb-5">
                        <div
                            className="p-4 mb-4"
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
                                {notificacionesNoLeidas > 0
                                    ? `${notificacionesNoLeidas} sin leer`
                                    : 'Todas leídas'}
                            </h4>
                            {notificacionesNoLeidas > 0 && (
                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={marcarTodasLeidas}
                                >
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>

                        {cargandoNotificaciones && (
                            <div className="text-center py-5">
                                <div className="spinner-border" style={{ color: '#1e3a5f' }} role="status" />
                                <p className="mt-3">Cargando notificaciones...</p>
                            </div>
                        )}

                        {!cargandoNotificaciones && notificaciones.length === 0 && (
                            <div className="card text-center p-5" style={{ borderRadius: '18px' }}>
                                <div style={{ fontSize: '3rem' }}>🔔</div>
                                <h4 className="mt-3">No tienes notificaciones</h4>
                                <p className="mb-0 text-muted">Cuando haya novedades aparecerán aquí.</p>
                            </div>
                        )}

                        {!cargandoNotificaciones &&
                            notificaciones.map((notif) => (
                                <article
                                    key={notif.id}
                                    className="card mb-3"
                                    style={{
                                        borderRadius: '16px',
                                        borderLeft: notif.leido ? '5px solid #94a3b8' : '5px solid #0d6efd',
                                        background: notif.leido ? '#ffffff' : '#f0f7ff',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        if (!notif.leido) marcarComoLeida(notif.id)
                                    }}
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
                                                <small className="text-muted">
                                                    {formatearFecha(notif.created_at)}
                                                </small>
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
                )}

                {/* ==================== MENSAJES ==================== */}
                {seccion === 'mensajes' && (
                    <div className="container py-4 pb-5">
                        <div
                            className="p-4 mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.97), rgba(91, 155, 213, 0.90))',
                                borderRadius: '20px'
                            }}
                        >
                            <h1 style={{ color: '#ffffff', fontSize: '2rem', marginBottom: '0.5rem' }}>
                                MENSAJES ANÓNIMOS
                            </h1>
                            <p className="mb-0" style={{ color: '#ffffff', opacity: 0.92 }}>
                                El docente verá tus mensajes de forma anónima.
                                Tú sí podrás ver el nombre y cargo de quien te responda.
                            </p>
                        </div>

                        {errorMensajes && (
                            <div className="alert alert-danger">{errorMensajes}</div>
                        )}

                        {!conversacionAbierta && (
                            <>
                                <div className="card mb-4" style={{ maxWidth: '720px', borderRadius: '20px' }}>
                                    <div className="card-body p-4">
                                        <h4 className="mb-3">INICIAR UNA CONVERSACIÓN</h4>

                                        <form onSubmit={enviarMensajeInicial}>
                                            <div className="mb-3">
                                                <label className="form-label">Destinatario</label>
                                                <select
                                                    className="form-select"
                                                    value={destinatarioId}
                                                    onChange={(e) => setDestinatarioId(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Selecciona a quién deseas escribir</option>
                                                    {destinatarios.map((destinatario) => (
                                                        <option key={destinatario.id} value={destinatario.id}>
                                                            {obtenerEtiquetaDestinatario(destinatario)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label">Escribe tu mensaje</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="6"
                                                    maxLength="2000"
                                                    placeholder="Escribe aquí tu mensaje. Tu identidad permanecerá oculta."
                                                    value={mensajeInicial}
                                                    onChange={(e) => {
                                                        setMensajeInicial(e.target.value)
                                                        setAdvertenciaContenido(
                                                            revisarContenidoAntesDeEnviar(e.target.value.trim())
                                                        )
                                                    }}
                                                    required
                                                />
                                                <small className="text-muted">
                                                    {mensajeInicial.length}/2000 caracteres
                                                </small>
                                            </div>

                                            {advertenciaContenido && (
                                                <div className="alert alert-warning">
                                                    <strong>⚠️ Aviso de contenido delicado.</strong>
                                                    <br />
                                                    {advertenciaContenido}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={enviandoMensaje}
                                            >
                                                {enviandoMensaje ? 'Enviando...' : 'Iniciar conversación'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div
                                    className="d-flex justify-content-between align-items-center mb-3"
                                    style={{ maxWidth: '720px' }}
                                >
                                    <h3 className="mb-0">MIS CONVERSACIONES</h3>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={cargarConversaciones}
                                        disabled={cargandoMensajes}
                                    >
                                        ↻ Actualizar
                                    </button>
                                </div>

                                {cargandoMensajes && (
                                    <div className="text-center py-4" style={{ maxWidth: '720px' }}>
                                        <div className="spinner-border" style={{ color: '#1e3a5f' }} role="status">
                                            <span className="visually-hidden">Cargando...</span>
                                        </div>
                                    </div>
                                )}

                                {!cargandoMensajes && mensajesEnviados.length === 0 && (
                                    <div className="card p-4" style={{ maxWidth: '720px', borderRadius: '20px' }}>
                                        <p className="mb-0">Aún no has iniciado conversaciones.</p>
                                    </div>
                                )}

                                {!cargandoMensajes &&
                                    mensajesEnviados.map((item) => (
                                        <article
                                            key={item.id}
                                            className="card mb-3"
                                            style={{ maxWidth: '720px', borderRadius: '18px' }}
                                        >
                                            <div className="card-body p-4">
                                                <div className="d-flex justify-content-between gap-3 mb-3">
                                                    <div>
                                                        <strong style={{ color: '#1e3a5f' }}>
                                                            {obtenerEtiquetaDestinatario(item.perfiles)}
                                                        </strong>
                                                        <br />
                                                        <small className="text-muted">
                                                            Iniciada: {formatearFecha(item.created_at)}
                                                        </small>
                                                    </div>
                                                    <span
                                                        className={`badge ${claseEstado(item.estado)}`}
                                                        style={{ height: 'fit-content' }}
                                                    >
                                                        {textoEstado(item.estado)}
                                                    </span>
                                                </div>

                                                <p className="mb-3" style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
                                                    {item.contenido.length > 180
                                                        ? `${item.contenido.slice(0, 180)}...`
                                                        : item.contenido}
                                                </p>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary"
                                                    onClick={() => abrirConversacion(item)}
                                                >
                                                    Abrir conversación
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                            </>
                        )}

                        {conversacionAbierta && (
                            <div
                                className="card"
                                style={{ maxWidth: '850px', borderRadius: '20px', overflow: 'hidden' }}
                            >
                                <div
                                    className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 p-3"
                                    style={{ background: 'rgba(30, 58, 95, 0.08)' }}
                                >
                                    <div>
                                        <strong style={{ color: '#1e3a5f' }}>
                                            {obtenerEtiquetaDestinatario(conversacionAbierta.perfiles)}
                                        </strong>
                                        <br />
                                        <small className="text-muted">Conversación anónima</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={cerrarConversacion}
                                    >
                                        ← Volver a conversaciones
                                    </button>
                                </div>

                                <div
                                    className="card-body p-3 p-md-4"
                                    style={{ minHeight: '380px', background: '#f8fafc' }}
                                >
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-start">
                                            <div
                                                className="p-3"
                                                style={{
                                                    maxWidth: '80%',
                                                    background: '#dbeafe',
                                                    borderRadius: '16px 16px 16px 4px',
                                                    color: '#1e3a5f'
                                                }}
                                            >
                                                <strong>Yo</strong>
                                                <p className="mb-1 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {conversacionAbierta.contenido}
                                                </p>
                                                <small style={{ opacity: 0.75 }}>
                                                    {formatearFecha(conversacionAbierta.created_at)}
                                                </small>
                                            </div>
                                        </div>
                                    </div>

                                    {cargandoChat && (
                                        <div className="text-center py-4">
                                            <div className="spinner-border" style={{ color: '#1e3a5f' }} role="status">
                                                <span className="visually-hidden">Cargando...</span>
                                            </div>
                                        </div>
                                    )}

                                    {!cargandoChat && mensajesChat.length === 0 && (
                                        <p className="text-center text-muted py-4">
                                            Aún no hay respuestas en esta conversación.
                                        </p>
                                    )}

                                    {!cargandoChat &&
                                        mensajesChat.map((item) => {
                                            const esEstudiante = item.remitente_tipo === 'estudiante'
                                            const perfilDocente = item.perfiles || conversacionAbierta.perfiles
                                            const nombreDocente = perfilDocente?.nombre || 'Docente'
                                            const cargoDocente =
                                                perfilDocente?.materia ||
                                                perfilDocente?.rol ||
                                                'Personal institucional'
                                            const fotoDocente =
                                                perfilDocente?.foto_url ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    nombreDocente
                                                )}&background=1e3a5f&color=fff`

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`d-flex mb-3 ${esEstudiante ? 'justify-content-end' : 'justify-content-start'}`}
                                                >
                                                    <div
                                                        className="p-3"
                                                        style={{
                                                            maxWidth: '80%',
                                                            background: esEstudiante ? '#dbeafe' : '#ffffff',
                                                            border: esEstudiante ? 'none' : '1px solid #e2e8f0',
                                                            boxShadow: esEstudiante
                                                                ? 'none'
                                                                : '0 2px 8px rgba(15, 23, 42, 0.06)',
                                                            borderRadius: esEstudiante
                                                                ? '16px 16px 4px 16px'
                                                                : '16px 16px 16px 4px',
                                                            color: '#334155'
                                                        }}
                                                    >
                                                        {esEstudiante ? (
                                                            <strong style={{ color: '#1e3a5f' }}>Yo</strong>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                                <img
                                                                    src={fotoDocente}
                                                                    alt="Foto del docente"
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        borderRadius: '50%',
                                                                        objectFit: 'cover'
                                                                    }}
                                                                />
                                                                <div>
                                                                    <strong style={{ color: '#1e3a5f' }}>
                                                                        {nombreDocente}
                                                                    </strong>
                                                                    <br />
                                                                    <small className="text-muted">{cargoDocente}</small>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <p className="mb-1 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                                                            {item.contenido}
                                                        </p>
                                                        <small className="text-muted">
                                                            {formatearFecha(item.created_at)}
                                                        </small>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>

                                <div className="card-footer bg-white p-3">
                                    <form onSubmit={enviarMensajeChat}>
                                        <label className="form-label">Responder en esta conversación</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            maxLength="2000"
                                            placeholder="Escribe tu respuesta. El docente seguirá viendo tu identidad de forma anónima."
                                            value={nuevoMensajeChat}
                                            onChange={(e) => setNuevoMensajeChat(e.target.value)}
                                            required
                                        />
                                        <div className="d-flex justify-content-between align-items-center mt-2 gap-3">
                                            <small className="text-muted">
                                                {nuevoMensajeChat.length}/2000 caracteres
                                            </small>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={enviandoChat}
                                            >
                                                {enviandoChat ? 'Enviando...' : 'Enviar'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default VistaEstudiante