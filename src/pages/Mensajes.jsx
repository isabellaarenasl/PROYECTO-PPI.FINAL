import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Mensajes() {
    const [conversaciones, setConversaciones] = useState([])
    const [ultimosMensajes, setUltimosMensajes] = useState({})
    const [mensajesNuevos, setMensajesNuevos] = useState({})
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [filtro, setFiltro] = useState('todos')
    const [conversacionAbierta, setConversacionAbierta] = useState(null)
    const [mensajesChat, setMensajesChat] = useState([])
    const [cargandoChat, setCargandoChat] = useState(false)
    const [nuevoMensajeChat, setNuevoMensajeChat] = useState('')
    const [enviandoChat, setEnviandoChat] = useState(false)
    const [procesandoId, setProcesandoId] = useState('')

    useEffect(() => {
        cargarConversaciones()
    }, [])

    const cargarUltimosMensajes = async (listaConversaciones) => {
        if (!listaConversaciones || listaConversaciones.length === 0) {
            setUltimosMensajes({})
            setMensajesNuevos({})
            return
        }

        const idsConversaciones = listaConversaciones.map(
            (conversacion) => conversacion.id
        )

        const { data, error: errorUltimos } = await supabase
            .from('mensajes_chat')
            .select(`
                id,
                mensaje_id,
                remitente_tipo,
                docente_id,
                contenido,
                created_at
            `)
            .in('mensaje_id', idsConversaciones)
            .order('created_at', {
                ascending: false
            })

        if (errorUltimos) {
            console.error(
                'No fue posible cargar los últimos mensajes:',
                errorUltimos
            )
            return
        }

        const ultimos = {}

        for (const item of data || []) {
            if (!ultimos[item.mensaje_id]) {
                ultimos[item.mensaje_id] = item
            }
        }

        const nuevos = {}

        for (const conversacion of listaConversaciones) {
            const ultimoMensaje = ultimos[conversacion.id]

            nuevos[conversacion.id] =
                conversacion.estado === 'enviado' ||
                ultimoMensaje?.remitente_tipo === 'estudiante'
        }

        setUltimosMensajes(ultimos)
        setMensajesNuevos(nuevos)
    }

    const cargarConversaciones = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            setCargando(false)
            return
        }

        const { data, error: errorMensajes } = await supabase
            .from('mensajes')
            .select(`
                id,
                destinatario_id,
                contenido,
                contenido_censurado,
                estado,
                created_at,
                tiene_contenido_delicado,
                estado_revision,
                motivo_alerta,
                revisado_por,
                revisado_at,
                ocultado_at
            `)
            .eq('destinatario_id', session.user.id)
            .neq('estado_revision', 'ocultado')
            .order('created_at', {
                ascending: false
            })

        if (errorMensajes) {
            console.error(errorMensajes)
            setError(
                `No fue posible cargar las conversaciones: ${errorMensajes.message}`
            )
            setCargando(false)
            return
        }

        const listaConversaciones = data || []

        setConversaciones(listaConversaciones)

        await cargarUltimosMensajes(listaConversaciones)

        setCargando(false)
    }

    const cargarMensajesChat = async (mensajeId) => {
        setCargandoChat(true)

        const { data, error: errorChat } = await supabase
            .from('mensajes_chat')
            .select(`
                id,
                mensaje_id,
                remitente_tipo,
                docente_id,
                contenido,
                created_at
            `)
            .eq('mensaje_id', mensajeId)
            .order('created_at', {
                ascending: true
            })

        if (errorChat) {
            console.error(errorChat)
            setError(
                `No fue posible cargar los mensajes del chat: ${errorChat.message}`
            )
            setCargandoChat(false)
            return
        }

        setMensajesChat(data || [])
        setCargandoChat(false)
    }

    const registrarAuditoria = async (mensajeId, accion) => {
        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            return
        }

        const { error: errorAuditoria } = await supabase
            .from('auditoria_mensajes_delicados')
            .insert({
                mensaje_id: mensajeId,
                docente_id: session.user.id,
                accion
            })

        if (errorAuditoria) {
            console.warn(
                'No se pudo registrar la auditoría:',
                errorAuditoria
            )
        }
    }

    const actualizarConversacionLocal = (mensajeId, cambios) => {
        setConversaciones((listaActual) =>
            listaActual.map((item) =>
                item.id === mensajeId
                    ? {
                        ...item,
                        ...cambios
                    }
                    : item
            )
        )

        setConversacionAbierta((actual) => {
            if (!actual || actual.id !== mensajeId) {
                return actual
            }

            return {
                ...actual,
                ...cambios
            }
        })
    }

    const abrirConversacion = async (conversacion) => {
        setError('')
        setConversacionAbierta(conversacion)
        setNuevoMensajeChat('')

        await cargarMensajesChat(conversacion.id)

        if (conversacion.estado !== 'enviado') {
            return
        }

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            return
        }

        const { error: errorActualizar } = await supabase
            .from('mensajes')
            .update({
                estado: 'leido'
            })
            .eq('id', conversacion.id)
            .eq('destinatario_id', session.user.id)
            .eq('estado', 'enviado')

        if (errorActualizar) {
            console.error(errorActualizar)
            return
        }

        actualizarConversacionLocal(conversacion.id, {
            estado: 'leido'
        })

        setMensajesNuevos((estadoActual) => ({
            ...estadoActual,
            [conversacion.id]: false
        }))

        await cargarConversaciones()
    }

    const revisarContenido = async (conversacion) => {
        setProcesandoId(conversacion.id)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            setProcesandoId('')
            return
        }

        const fechaRevision = new Date().toISOString()

        const { error: errorActualizar } = await supabase
            .from('mensajes')
            .update({
                estado_revision: 'revisado',
                revisado_por: session.user.id,
                revisado_at: fechaRevision,
                estado: 'leido'
            })
            .eq('id', conversacion.id)
            .eq('destinatario_id', session.user.id)

        if (errorActualizar) {
            console.error(errorActualizar)
            setError(
                `No fue posible revisar el mensaje: ${errorActualizar.message}`
            )
            setProcesandoId('')
            return
        }

        await registrarAuditoria(
            conversacion.id,
            'revelo_contenido'
        )

        const conversacionRevisada = {
            ...conversacion,
            estado_revision: 'revisado',
            revisado_por: session.user.id,
            revisado_at: fechaRevision,
            estado: 'leido'
        }

        actualizarConversacionLocal(conversacion.id, {
            estado_revision: 'revisado',
            revisado_por: session.user.id,
            revisado_at: fechaRevision,
            estado: 'leido'
        })

        setMensajesNuevos((estadoActual) => ({
            ...estadoActual,
            [conversacion.id]: false
        }))

        setProcesandoId('')
        await abrirConversacion(conversacionRevisada)
    }

    const ocultarConversacion = async (mensajeId) => {
        setProcesandoId(mensajeId)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            setProcesandoId('')
            return
        }

        const { error: errorActualizar } = await supabase
            .from('mensajes')
            .update({
                estado_revision: 'ocultado',
                revisado_por: session.user.id,
                ocultado_at: new Date().toISOString()
            })
            .eq('id', mensajeId)
            .eq('destinatario_id', session.user.id)

        if (errorActualizar) {
            console.error(errorActualizar)
            setError(
                `No fue posible ocultar la conversación: ${errorActualizar.message}`
            )
            setProcesandoId('')
            return
        }

        await registrarAuditoria(
            mensajeId,
            'oculto_mensaje'
        )

        setConversaciones((listaActual) =>
            listaActual.filter((item) => item.id !== mensajeId)
        )

        setUltimosMensajes((estadoActual) => {
            const copia = { ...estadoActual }
            delete copia[mensajeId]
            return copia
        })

        setMensajesNuevos((estadoActual) => {
            const copia = { ...estadoActual }
            delete copia[mensajeId]
            return copia
        })

        if (conversacionAbierta?.id === mensajeId) {
            cerrarConversacion()
        }

        setProcesandoId('')
    }

    const enviarMensajeChat = async (e) => {
        e.preventDefault()

        setError('')

        const textoLimpio = nuevoMensajeChat.trim()

        if (!conversacionAbierta) {
            setError('Abre una conversación antes de responder.')
            return
        }

        if (!textoLimpio) {
            setError('Escribe una respuesta antes de enviarla.')
            return
        }

        setEnviandoChat(true)

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            setEnviandoChat(false)
            return
        }

        const { error: errorInsertar } = await supabase
            .from('mensajes_chat')
            .insert({
                mensaje_id: conversacionAbierta.id,
                remitente_tipo: 'docente',
                docente_id: session.user.id,
                contenido: textoLimpio
            })

        if (errorInsertar) {
            console.error(errorInsertar)
            setError(
                `No fue posible enviar la respuesta: ${errorInsertar.message}`
            )
            setEnviandoChat(false)
            return
        }

        const { error: errorEstado } = await supabase
            .from('mensajes')
            .update({
                estado: 'respondido'
            })
            .eq('id', conversacionAbierta.id)
            .eq('destinatario_id', session.user.id)

        if (errorEstado) {
            console.warn(
                'La respuesta fue enviada, pero no se actualizó el estado:',
                errorEstado
            )
        }

        if (conversacionAbierta.tiene_contenido_delicado) {
            await registrarAuditoria(
                conversacionAbierta.id,
                'respondio_mensaje'
            )
        }

        actualizarConversacionLocal(conversacionAbierta.id, {
            estado: 'respondido'
        })

        setMensajesNuevos((estadoActual) => ({
            ...estadoActual,
            [conversacionAbierta.id]: false
        }))

        setUltimosMensajes((estadoActual) => ({
            ...estadoActual,
            [conversacionAbierta.id]: {
                mensaje_id: conversacionAbierta.id,
                remitente_tipo: 'docente',
                docente_id: session.user.id,
                contenido: textoLimpio,
                created_at: new Date().toISOString()
            }
        }))

        setNuevoMensajeChat('')
        setEnviandoChat(false)

        await cargarMensajesChat(conversacionAbierta.id)
        await cargarConversaciones()
    }

    const cerrarConversacion = () => {
        setConversacionAbierta(null)
        setMensajesChat([])
        setNuevoMensajeChat('')
    }

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(fecha))
    }

    const obtenerClaseEstado = (estado) => {
        if (estado === 'respondido') {
            return 'bg-success'
        }

        if (estado === 'leido') {
            return 'bg-primary'
        }

        return 'bg-secondary'
    }

    const obtenerTextoEstado = (estado) => {
        if (estado === 'respondido') {
            return 'En conversación'
        }

        if (estado === 'leido') {
            return 'Leído'
        }

        return 'Nuevo'
    }

    const conversacionesFiltradas = conversaciones.filter((item) => {
        if (filtro === 'alertas') {
            return (
                item.tiene_contenido_delicado &&
                item.estado_revision === 'pendiente_revision'
            )
        }

        if (filtro === 'nuevos') {
            return mensajesNuevos[item.id] === true
        }

        if (filtro === 'normales') {
            return !item.tiene_contenido_delicado
        }

        if (filtro === 'revisados') {
            return item.estado_revision === 'revisado'
        }

        return true
    })

    const cantidadAlertas = conversaciones.filter(
        (item) =>
            item.tiene_contenido_delicado &&
            item.estado_revision === 'pendiente_revision'
    ).length

    const cantidadNuevos = conversaciones.filter(
        (item) =>
            mensajesNuevos[item.id] === true &&
            !(
                item.tiene_contenido_delicado &&
                item.estado_revision === 'pendiente_revision'
            )
    ).length

    return (
        <div className="container py-4 pb-5">
            <div
                className="p-4 mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(30, 58, 95, 0.97), rgba(91, 155, 213, 0.90))',
                    borderRadius: '20px'
                }}
            >
                <h1
                    style={{
                        color: '#ffffff',
                        fontSize: '2rem',
                        marginBottom: '0.5rem'
                    }}
                >
                    MENSAJES
                </h1>

                <p
                    className="mb-0"
                    style={{
                        color: '#ffffff',
                        opacity: 0.92
                    }}
                >
                    Conversaciones anónimas con estudiantes. El estudiante verá
                    tu nombre y cargo al recibir una respuesta.
                </p>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {cantidadNuevos > 0 && (
                <div
                    className="alert alert-primary d-flex flex-wrap justify-content-between align-items-center gap-3"
                    role="alert"
                    style={{
                        borderLeft: '6px solid #0d6efd'
                    }}
                >
                    <div>
                        <strong>
                            🔵 Tienes {cantidadNuevos}{' '}
                            {cantidadNuevos === 1
                                ? 'mensaje nuevo'
                                : 'mensajes nuevos'}{' '}
                            de estudiantes.
                        </strong>

                        <br />

                        Las conversaciones nuevas aparecen con fondo azul y
                        texto destacado.
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setFiltro('nuevos')}
                    >
                        Ver nuevos
                    </button>
                </div>
            )}

            {cantidadAlertas > 0 && (
                <div
                    className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-3"
                    role="alert"
                    style={{
                        borderLeft: '6px solid #ffc107'
                    }}
                >
                    <div>
                        <strong>
                            ⚠️ Hay {cantidadAlertas}{' '}
                            {cantidadAlertas === 1
                                ? 'conversación'
                                : 'conversaciones'}{' '}
                            con posible contenido delicado.
                        </strong>

                        <br />

                        Las palabras detectadas están cubiertas hasta que
                        decidas revisar el contenido completo.
                    </div>

                    <button
                        type="button"
                        className="btn btn-warning"
                        onClick={() => setFiltro('alertas')}
                    >
                        Ver alertas
                    </button>
                </div>
            )}

            {!conversacionAbierta && (
                <>
                    <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-4">
                        <div className="btn-group flex-wrap" role="group">
                            <button
                                type="button"
                                className={`btn ${filtro === 'todos'
                                        ? 'btn-primary'
                                        : 'btn-outline-primary'
                                    }`}
                                onClick={() => setFiltro('todos')}
                            >
                                Todos
                            </button>

                            <button
                                type="button"
                                className={`btn ${filtro === 'nuevos'
                                        ? 'btn-primary'
                                        : 'btn-outline-primary'
                                    }`}
                                onClick={() => setFiltro('nuevos')}
                            >
                                🔵 Nuevos
                                {cantidadNuevos > 0 &&
                                    ` (${cantidadNuevos})`}
                            </button>

                            <button
                                type="button"
                                className={`btn ${filtro === 'alertas'
                                        ? 'btn-warning'
                                        : 'btn-outline-warning'
                                    }`}
                                onClick={() => setFiltro('alertas')}
                            >
                                ⚠️ Alertas
                                {cantidadAlertas > 0 &&
                                    ` (${cantidadAlertas})`}
                            </button>

                            <button
                                type="button"
                                className={`btn ${filtro === 'normales'
                                        ? 'btn-primary'
                                        : 'btn-outline-primary'
                                    }`}
                                onClick={() => setFiltro('normales')}
                            >
                                Normales
                            </button>

                            <button
                                type="button"
                                className={`btn ${filtro === 'revisados'
                                        ? 'btn-success'
                                        : 'btn-outline-success'
                                    }`}
                                onClick={() => setFiltro('revisados')}
                            >
                                Revisados
                            </button>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={cargarConversaciones}
                            disabled={cargando}
                        >
                            ↻ Actualizar
                        </button>
                    </div>

                    {cargando && (
                        <div className="text-center py-5">
                            <div
                                className="spinner-border"
                                style={{ color: '#1e3a5f' }}
                                role="status"
                            >
                                <span className="visually-hidden">
                                    Cargando...
                                </span>
                            </div>

                            <p className="mt-3 mb-0">
                                Cargando conversaciones...
                            </p>
                        </div>
                    )}

                    {!cargando &&
                        conversacionesFiltradas.length === 0 && (
                            <div
                                className="card p-4"
                                style={{
                                    borderRadius: '18px',
                                    maxWidth: '850px'
                                }}
                            >
                                <h5>No hay conversaciones en esta sección.</h5>

                                <p className="mb-0 text-muted">
                                    Las conversaciones anónimas enviadas a tu
                                    cuenta aparecerán aquí.
                                </p>
                            </div>
                        )}

                    {!cargando &&
                        conversacionesFiltradas.map((item) => {
                            const esAlertaPendiente =
                                item.tiene_contenido_delicado &&
                                item.estado_revision ===
                                'pendiente_revision'

                            const ultimoMensaje = ultimosMensajes[item.id]

                            const hayMensajeNuevo =
                                mensajesNuevos[item.id] === true &&
                                !esAlertaPendiente

                            const textoVistaPrevia = esAlertaPendiente
                                ? item.contenido_censurado ||
                                'Contenido protegido para revisión.'
                                : ultimoMensaje?.contenido || item.contenido

                            const etiquetaUltimoMensaje = ultimoMensaje
                                ? ultimoMensaje.remitente_tipo ===
                                    'estudiante'
                                    ? 'Estudiante anónimo'
                                    : 'Tú'
                                : 'Estudiante anónimo'

                            return (
                                <article
                                    key={item.id}
                                    className="card mb-3"
                                    style={{
                                        borderRadius: '18px',
                                        maxWidth: '850px',
                                        border: esAlertaPendiente
                                            ? '1px solid #ffda6a'
                                            : hayMensajeNuevo
                                                ? '1px solid #86b7fe'
                                                : '1px solid #d1e7dd',
                                        borderLeft: esAlertaPendiente
                                            ? '7px solid #ffc107'
                                            : hayMensajeNuevo
                                                ? '7px solid #0d6efd'
                                                : '7px solid #198754',
                                        background: hayMensajeNuevo
                                            ? '#f0f7ff'
                                            : '#ffffff',
                                        boxShadow: hayMensajeNuevo
                                            ? '0 5px 16px rgba(13, 110, 253, 0.16)'
                                            : '0 2px 8px rgba(15, 23, 42, 0.05)'
                                    }}
                                >
                                    <div className="card-body p-4">
                                        <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                                            <div>
                                                <h5
                                                    className="mb-1"
                                                    style={{
                                                        color: hayMensajeNuevo
                                                            ? '#0d6efd'
                                                            : '#1e3a5f',
                                                        fontWeight:
                                                            hayMensajeNuevo
                                                                ? '800'
                                                                : '700'
                                                    }}
                                                >
                                                    {esAlertaPendiente
                                                        ? '⚠️ Conversación con posible contenido delicado'
                                                        : hayMensajeNuevo
                                                            ? '🔵 NUEVO MENSAJE'
                                                            : 'Estudiante anónimo'}
                                                </h5>

                                                <small className="text-muted">
                                                    Recibido:{' '}
                                                    {formatearFecha(
                                                        item.created_at
                                                    )}
                                                </small>
                                            </div>

                                            {esAlertaPendiente ? (
                                                <span className="badge bg-warning text-dark">
                                                    ⚠️ Pendiente de revisión
                                                </span>
                                            ) : hayMensajeNuevo ? (
                                                <span
                                                    className="badge bg-primary"
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        padding:
                                                            '0.55rem 0.7rem',
                                                        height: 'fit-content'
                                                    }}
                                                >
                                                    🔵 Nuevo
                                                </span>
                                            ) : (
                                                <span
                                                    className="badge bg-success"
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        padding:
                                                            '0.55rem 0.7rem',
                                                        height: 'fit-content'
                                                    }}
                                                >
                                                    ✓ En conversación
                                                </span>
                                            )}
                                        </div>

                                        <p
                                            className="mb-2"
                                            style={{
                                                color: hayMensajeNuevo
                                                    ? '#0f172a'
                                                    : '#334155',
                                                fontWeight: hayMensajeNuevo
                                                    ? '700'
                                                    : '400'
                                            }}
                                        >
                                            {esAlertaPendiente
                                                ? 'Vista previa con palabras cubiertas:'
                                                : hayMensajeNuevo
                                                    ? 'Nuevo mensaje de Estudiante anónimo:'
                                                    : `Último mensaje de ${etiquetaUltimoMensaje}:`}
                                        </p>

                                        <p
                                            className="mb-3"
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                color: hayMensajeNuevo
                                                    ? '#0f172a'
                                                    : '#334155',
                                                fontWeight: hayMensajeNuevo
                                                    ? '700'
                                                    : '400'
                                            }}
                                        >
                                            {textoVistaPrevia.length > 250
                                                ? `${textoVistaPrevia.slice(
                                                    0,
                                                    250
                                                )}...`
                                                : textoVistaPrevia}
                                        </p>

                                        {esAlertaPendiente ? (
                                            <div className="d-flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-warning"
                                                    onClick={() =>
                                                        revisarContenido(item)
                                                    }
                                                    disabled={
                                                        procesandoId === item.id
                                                    }
                                                >
                                                    {procesandoId === item.id
                                                        ? 'Abriendo...'
                                                        : 'Revisar contenido completo'}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    onClick={() =>
                                                        ocultarConversacion(
                                                            item.id
                                                        )
                                                    }
                                                    disabled={
                                                        procesandoId === item.id
                                                    }
                                                >
                                                    Ocultar conversación
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className={`btn ${hayMensajeNuevo
                                                        ? 'btn-primary'
                                                        : 'btn-outline-primary'
                                                    }`}
                                                onClick={() =>
                                                    abrirConversacion(item)
                                                }
                                            >
                                                {hayMensajeNuevo
                                                    ? 'Leer y responder'
                                                    : 'Abrir conversación'}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                </>
            )}

            {conversacionAbierta && (
                <div
                    className="card"
                    style={{
                        maxWidth: '900px',
                        borderRadius: '20px',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 p-3"
                        style={{
                            background: 'rgba(30, 58, 95, 0.08)'
                        }}
                    >
                        <div>
                            <strong
                                style={{
                                    color: '#1e3a5f'
                                }}
                            >
                                Estudiante anónimo
                            </strong>

                            <br />

                            <small className="text-muted">
                                Conversación privada y anónima
                            </small>
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
                        style={{
                            minHeight: '420px',
                            background: '#f8fafc'
                        }}
                    >
                        <div className="d-flex justify-content-start mb-4">
                            <div
                                className="p-3"
                                style={{
                                    maxWidth: '80%',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '16px 16px 16px 4px',
                                    color: '#334155'
                                }}
                            >
                                <strong
                                    style={{
                                        color: '#1e3a5f'
                                    }}
                                >
                                    Estudiante anónimo
                                </strong>

                                <p
                                    className="mb-1 mt-2"
                                    style={{
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {conversacionAbierta.contenido}
                                </p>

                                <small className="text-muted">
                                    {formatearFecha(
                                        conversacionAbierta.created_at
                                    )}
                                </small>
                            </div>
                        </div>

                        {cargandoChat && (
                            <div className="text-center py-4">
                                <div
                                    className="spinner-border"
                                    style={{
                                        color: '#1e3a5f'
                                    }}
                                    role="status"
                                >
                                    <span className="visually-hidden">
                                        Cargando...
                                    </span>
                                </div>
                            </div>
                        )}

                        {!cargandoChat &&
                            mensajesChat.length === 0 && (
                                <p className="text-center text-muted py-4">
                                    Aún no hay más mensajes en esta conversación.
                                </p>
                            )}

                        {!cargandoChat &&
                            mensajesChat.map((item) => {
                                const esDocente =
                                    item.remitente_tipo === 'docente'

                                return (
                                    <div
                                        key={item.id}
                                        className={`d-flex mb-3 ${esDocente
                                                ? 'justify-content-end'
                                                : 'justify-content-start'
                                            }`}
                                    >
                                        <div
                                            className="p-3"
                                            style={{
                                                maxWidth: '80%',
                                                background: esDocente
                                                    ? '#dbeafe'
                                                    : '#ffffff',
                                                border: esDocente
                                                    ? 'none'
                                                    : '1px solid #e2e8f0',
                                                borderRadius: esDocente
                                                    ? '16px 16px 4px 16px'
                                                    : '16px 16px 16px 4px',
                                                color: '#334155'
                                            }}
                                        >
                                            <strong
                                                style={{
                                                    color: '#1e3a5f'
                                                }}
                                            >
                                                {esDocente
                                                    ? 'Tú'
                                                    : 'Estudiante anónimo'}
                                            </strong>

                                            <p
                                                className="mb-1 mt-2"
                                                style={{
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            >
                                                {item.contenido}
                                            </p>

                                            <small className="text-muted">
                                                {formatearFecha(
                                                    item.created_at
                                                )}
                                            </small>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>

                    <div className="card-footer bg-white p-3">
                        <form onSubmit={enviarMensajeChat}>
                            <label className="form-label">
                                Responder al estudiante
                            </label>

                            <textarea
                                className="form-control"
                                rows="3"
                                maxLength="2000"
                                placeholder="Escribe una respuesta clara, respetuosa y orientadora."
                                value={nuevoMensajeChat}
                                onChange={(e) =>
                                    setNuevoMensajeChat(e.target.value)
                                }
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
                                    {enviandoChat
                                        ? 'Enviando...'
                                        : 'Enviar respuesta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Mensajes