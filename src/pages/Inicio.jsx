import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const OPCIONES_REACCION = [
    {
        tipo: 'me_gusta',
        emoji: '❤️',
        texto: 'Me gusta'
    },
    {
        tipo: 'me_encanta',
        emoji: '🥰',
        texto: 'Me encanta'
    },
    {
        tipo: 'me_importa',
        emoji: '🤝',
        texto: 'Me importa'
    }
]

function Inicio({ onIrA, onCerrarSesion }) {
    const [publicaciones, setPublicaciones] = useState([])
    const [reacciones, setReacciones] = useState([])
    const [usuarioId, setUsuarioId] = useState(null)
    const [busqueda, setBusqueda] = useState('')
    const [mes, setMes] = useState('')
    const [anio, setAnio] = useState('')
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [mensaje, setMensaje] = useState('')
    const [imagenAbierta, setImagenAbierta] = useState(null)
    const [reaccionGuardando, setReaccionGuardando] = useState(null)

    useEffect(() => {
        cargarInicio()
    }, [])

    useEffect(() => {
        const cerrarConEscape = (event) => {
            if (event.key === 'Escape') {
                setImagenAbierta(null)
            }
        }

        window.addEventListener('keydown', cerrarConEscape)

        return () => {
            window.removeEventListener('keydown', cerrarConEscape)
        }
    }, [])

    const cargarInicio = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Debes iniciar sesión para ver las publicaciones.')
            setCargando(false)
            return
        }

        setUsuarioId(session.user.id)

        const { data: publicacionesData, error: publicacionesError } =
            await supabase
                .from('publicaciones')
                .select(`
                    id,
                    autor_id,
                    contenido,
                    imagen_url,
                    created_at,
                    perfiles!publicaciones_autor_id_perfiles_fkey (
                        id,
                        nombre,
                        materia,
                        rol,
                        foto_url
                    )
                `)
                .order('created_at', { ascending: false })

        if (publicacionesError) {
            console.error(publicacionesError)
            setError(
                'No se pudieron cargar las publicaciones. Verifica la relación entre publicaciones y perfiles en Supabase.'
            )
            setCargando(false)
            return
        }

        const { data: reaccionesData, error: reaccionesError } =
            await supabase
                .from('reacciones_publicaciones')
                .select('id, publicacion_id, usuario_id, tipo')

        if (reaccionesError) {
            console.error(reaccionesError)
            setError(
                'Las publicaciones cargaron, pero no fue posible cargar las reacciones.'
            )
        }

        setPublicaciones(publicacionesData || [])
        setReacciones(reaccionesData || [])
        setCargando(false)
    }

    const reaccionPropia = (publicacionId) => {
        return reacciones.find(
            (reaccion) =>
                reaccion.publicacion_id === publicacionId &&
                reaccion.usuario_id === usuarioId
        )
    }

    const contarReacciones = (publicacionId) => {
        return reacciones.filter(
            (reaccion) => reaccion.publicacion_id === publicacionId
        ).length
    }

    const contarPorTipo = (publicacionId, tipo) => {
        return reacciones.filter(
            (reaccion) =>
                reaccion.publicacion_id === publicacionId &&
                reaccion.tipo === tipo
        ).length
    }

    const actualizarReaccionLocal = (publicacionId, nuevaReaccion) => {
        setReacciones((reaccionesActuales) => {
            const sinReaccionAnterior = reaccionesActuales.filter(
                (reaccion) =>
                    !(
                        reaccion.publicacion_id === publicacionId &&
                        reaccion.usuario_id === usuarioId
                    )
            )

            if (!nuevaReaccion) {
                return sinReaccionAnterior
            }

            return [
                ...sinReaccionAnterior,
                {
                    id: nuevaReaccion.id || `temporal-${Date.now()}`,
                    publicacion_id: publicacionId,
                    usuario_id: usuarioId,
                    tipo: nuevaReaccion.tipo
                }
            ]
        })
    }

    const guardarReaccion = async (publicacionId, tipo) => {
        if (!usuarioId) {
            setError('No fue posible identificar tu sesión. Vuelve a iniciar sesión.')
            return
        }

        setError('')
        setMensaje('')
        setReaccionGuardando(publicacionId)

        const { data, error: errorReaccion } = await supabase
            .from('reacciones_publicaciones')
            .upsert(
                {
                    publicacion_id: publicacionId,
                    usuario_id: usuarioId,
                    tipo
                },
                {
                    onConflict: 'publicacion_id,usuario_id'
                }
            )
            .select()
            .single()

        if (errorReaccion) {
            console.error(errorReaccion)
            setError(
                `No se pudo guardar la reacción: ${errorReaccion.message}`
            )
        } else {
            actualizarReaccionLocal(publicacionId, data)
        }

        setReaccionGuardando(null)
    }

    const quitarReaccion = async (publicacionId) => {
        if (!usuarioId) {
            setError('No fue posible identificar tu sesión. Vuelve a iniciar sesión.')
            return
        }

        setError('')
        setMensaje('')
        setReaccionGuardando(publicacionId)

        const { error: errorEliminar } = await supabase
            .from('reacciones_publicaciones')
            .delete()
            .eq('publicacion_id', publicacionId)
            .eq('usuario_id', usuarioId)

        if (errorEliminar) {
            console.error(errorEliminar)
            setError(
                `No se pudo eliminar la reacción: ${errorEliminar.message}`
            )
        } else {
            actualizarReaccionLocal(publicacionId, null)
            setMensaje('Tu reacción fue eliminada.')
        }

        setReaccionGuardando(null)
    }

    const publicacionesFiltradas = useMemo(() => {
        return publicaciones.filter((publicacion) => {
            const perfil = publicacion.perfiles
            const nombreDocente = perfil?.nombre || ''
            const fechaPublicacion = new Date(publicacion.created_at)

            const coincideNombre = nombreDocente
                .toLowerCase()
                .includes(busqueda.trim().toLowerCase())

            const coincideMes =
                !mes ||
                String(fechaPublicacion.getMonth() + 1) === String(mes)

            const coincideAnio =
                !anio ||
                String(fechaPublicacion.getFullYear()) === String(anio)

            return coincideNombre && coincideMes && coincideAnio
        })
    }, [publicaciones, busqueda, mes, anio])

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'long',
            timeStyle: 'short'
        }).format(new Date(fecha))
    }

    const obtenerFotoPerfil = (perfil) => {
        if (perfil?.foto_url) {
            return perfil.foto_url
        }

        const nombre = perfil?.nombre || 'Conectate Candelaria'

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(
            nombre
        )}&background=1e3a5f&color=ffffff&bold=true`
    }

    const anioActual = new Date().getFullYear()

    const aniosDisponibles = Array.from(
        { length: 5 },
        (_, indice) => anioActual - indice
    )

    return (
        <div className="d-flex flex-column min-vh-100">
            <main className="container flex-grow-1 py-4 pb-5">
                <section
                    className="mb-4 p-4 p-md-5"
                    style={{
                        background:
                            'linear-gradient(135deg, rgba(30, 58, 95, 0.97), rgba(91, 155, 213, 0.90))',
                        borderRadius: '22px',
                        boxShadow: '0 10px 32px rgba(30, 58, 95, 0.28)'
                    }}
                >
                    <h1
                        style={{
                            color: '#ffffff',
                            fontSize: '2.2rem',
                            marginBottom: '0.5rem',
                            letterSpacing: '1.5px'
                        }}
                    >
                        INICIO
                    </h1>

                    <p
                        className="mb-0"
                        style={{
                            color: '#ffffff',
                            fontSize: '1.08rem',
                            opacity: 0.95
                        }}
                    >
                        Últimas publicaciones de docentes y personal institucional.
                    </p>
                </section>

                {onIrA && (
                    <section className="row g-3 mb-4">
                        <div className="col-12 col-md-4">
                            <button
                                className="btn navbar-gradient w-100 py-3 text-white border-0"
                                style={{ borderRadius: '14px', fontWeight: '600' }}
                                onClick={() => onIrA('notificaciones')}
                            >
                                🔔 Notificaciones
                            </button>
                        </div>

                        <div className="col-12 col-md-4">
                            <button
                                className="btn navbar-gradient w-100 py-3 text-white border-0"
                                style={{ borderRadius: '14px', fontWeight: '600' }}
                                onClick={() => onIrA('mensajes')}
                            >
                                ✉️ Mensajes
                            </button>
                        </div>

                        <div className="col-12 col-md-4">
                            <button
                                className="btn navbar-gradient w-100 py-3 text-white border-0"
                                style={{ borderRadius: '14px', fontWeight: '600' }}
                                onClick={() => onCerrarSesion && onCerrarSesion()}
                            >
                                🚪 Cerrar sesión
                            </button>
                        </div>
                    </section>
                )}

                <section
                    className="card mb-4"
                    style={{
                        borderRadius: '20px',
                        border: 'none'
                    }}
                >
                    <div className="card-body p-4">
                        <h4 className="mb-3">BUSCAR PUBLICACIONES</h4>

                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <label className="form-label">
                                    Nombre del docente o personal
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ejemplo: Andrea Gómez"
                                    value={busqueda}
                                    onChange={(e) =>
                                        setBusqueda(e.target.value)
                                    }
                                />
                            </div>

                            <div className="col-6 col-md-3">
                                <label className="form-label">Mes</label>

                                <select
                                    className="form-select"
                                    value={mes}
                                    onChange={(e) => setMes(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="1">Enero</option>
                                    <option value="2">Febrero</option>
                                    <option value="3">Marzo</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Mayo</option>
                                    <option value="6">Junio</option>
                                    <option value="7">Julio</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Septiembre</option>
                                    <option value="10">Octubre</option>
                                    <option value="11">Noviembre</option>
                                    <option value="12">Diciembre</option>
                                </select>
                            </div>

                            <div className="col-6 col-md-3">
                                <label className="form-label">Año</label>

                                <select
                                    className="form-select"
                                    value={anio}
                                    onChange={(e) => setAnio(e.target.value)}
                                >
                                    <option value="">Todos</option>

                                    {aniosDisponibles.map(
                                        (anioDisponible) => (
                                            <option
                                                key={anioDisponible}
                                                value={anioDisponible}
                                            >
                                                {anioDisponible}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>

                        {(busqueda || mes || anio) && (
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm mt-3"
                                onClick={() => {
                                    setBusqueda('')
                                    setMes('')
                                    setAnio('')
                                }}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </section>

                <div
                    className="d-flex justify-content-between align-items-center mb-3 mx-auto"
                    style={{ maxWidth: '680px' }}
                >
                    <h2 className="mb-0">PUBLICACIONES RECIENTES</h2>

                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={cargarInicio}
                        disabled={cargando}
                    >
                        ↻ Actualizar
                    </button>
                </div>

                {error && (
                    <div
                        className="alert alert-danger mx-auto"
                        style={{ maxWidth: '680px' }}
                    >
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div
                        className="alert alert-success mx-auto"
                        style={{ maxWidth: '680px' }}
                    >
                        {mensaje}
                    </div>
                )}

                {cargando && (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border"
                            style={{ color: '#1e3a5f' }}
                            role="status"
                        >
                            <span className="visually-hidden">
                                Cargando publicaciones...
                            </span>
                        </div>

                        <p className="mt-3">
                            Cargando publicaciones...
                        </p>
                    </div>
                )}

                {!cargando && !error && publicaciones.length === 0 && (
                    <div
                        className="card text-center p-5 mx-auto"
                        style={{
                            borderRadius: '20px',
                            maxWidth: '680px'
                        }}
                    >
                        <div style={{ fontSize: '3rem' }}>📢</div>

                        <h4 className="mt-3">
                            AÚN NO HAY PUBLICACIONES
                        </h4>

                        <p className="mb-0">
                            Cuando un docente cree un aviso, aparecerá aquí.
                        </p>
                    </div>
                )}

                {!cargando &&
                    !error &&
                    publicaciones.length > 0 &&
                    publicacionesFiltradas.length === 0 && (
                        <div
                            className="card text-center p-5 mx-auto"
                            style={{
                                borderRadius: '20px',
                                maxWidth: '680px'
                            }}
                        >
                            <div style={{ fontSize: '3rem' }}>🔎</div>

                            <h4 className="mt-3">
                                NO HAY RESULTADOS
                            </h4>

                            <p className="mb-0">
                                No encontramos publicaciones con los filtros seleccionados.
                            </p>
                        </div>
                    )}

                {!cargando &&
                    !error &&
                    publicacionesFiltradas.map((publicacion) => {
                        const perfil = publicacion.perfiles
                        const nombreAutor =
                            perfil?.nombre || 'Personal institucional'

                        const areaAutor =
                            perfil?.materia ||
                            perfil?.rol ||
                            'Institución Educativa Candelaria'

                        const reaccionDelUsuario = reaccionPropia(
                            publicacion.id
                        )

                        const estaGuardandoReaccion =
                            reaccionGuardando === publicacion.id

                        return (
                            <article
                                key={publicacion.id}
                                className="card mb-4 overflow-hidden mx-auto"
                                style={{
                                    borderRadius: '18px',
                                    border: '1px solid rgba(30, 58, 95, 0.12)',
                                    boxShadow:
                                        '0 8px 25px rgba(30, 58, 95, 0.16)',
                                    maxWidth: '680px',
                                    background: '#ffffff'
                                }}
                            >
                                <div className="card-body p-3 p-md-4">
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <div className="d-flex align-items-center">
                                            <img
                                                src={obtenerFotoPerfil(perfil)}
                                                alt={`Foto de ${nombreAutor}`}
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    marginRight: '12px',
                                                    border:
                                                        '2px solid rgba(91, 155, 213, 0.45)'
                                                }}
                                            />

                                            <div>
                                                <strong
                                                    style={{
                                                        color: '#1e3a5f',
                                                        fontSize: '1rem'
                                                    }}
                                                >
                                                    {nombreAutor}
                                                </strong>

                                                <br />

                                                <small
                                                    style={{
                                                        color: '#5b9bd5',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    {areaAutor}
                                                </small>
                                            </div>
                                        </div>

                                        <small
                                            className="text-end"
                                            style={{
                                                color: '#718096',
                                                maxWidth: '150px',
                                                fontSize: '0.78rem'
                                            }}
                                        >
                                            {formatearFecha(
                                                publicacion.created_at
                                            )}
                                        </small>
                                    </div>
                                </div>

                                {publicacion.imagen_url && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setImagenAbierta({
                                                url: publicacion.imagen_url,
                                                descripcion: `Imagen de la publicación de ${nombreAutor}`
                                            })
                                        }
                                        aria-label={`Abrir en grande la imagen de ${nombreAutor}`}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            border: 'none',
                                            padding: 0,
                                            margin: 0,
                                            cursor: 'zoom-in',
                                            background: '#eef4fa',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <img
                                            src={publicacion.imagen_url}
                                            alt={`Publicación de ${nombreAutor}`}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                height: '420px',
                                                objectFit: 'contain',
                                                objectPosition: 'center',
                                                background: '#eef4fa'
                                            }}
                                            onError={(e) => {
                                                e.currentTarget.parentElement.style.display =
                                                    'none'
                                            }}
                                        />
                                    </button>
                                )}

                                <div className="card-body px-3 px-md-4 pt-3 pb-4">
                                    <p
                                        className="mb-3"
                                        style={{
                                            color: '#334155',
                                            fontSize: '1rem',
                                            lineHeight: 1.7,
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        {publicacion.contenido}
                                    </p>

                                    <div
                                        className="pt-3"
                                        style={{
                                            borderTop:
                                                '1px solid rgba(30, 58, 95, 0.12)'
                                        }}
                                    >
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            {OPCIONES_REACCION.map(
                                                (opcion) => {
                                                    const seleccionada =
                                                        reaccionDelUsuario?.tipo ===
                                                        opcion.tipo

                                                    const cantidad =
                                                        contarPorTipo(
                                                            publicacion.id,
                                                            opcion.tipo
                                                        )

                                                    return (
                                                        <button
                                                            key={opcion.tipo}
                                                            type="button"
                                                            disabled={
                                                                estaGuardandoReaccion
                                                            }
                                                            onClick={() =>
                                                                guardarReaccion(
                                                                    publicacion.id,
                                                                    opcion.tipo
                                                                )
                                                            }
                                                            className="btn btn-sm"
                                                            style={{
                                                                borderRadius:
                                                                    '20px',
                                                                border:
                                                                    seleccionada
                                                                        ? '2px solid #1e3a5f'
                                                                        : '1px solid rgba(30, 58, 95, 0.22)',
                                                                background:
                                                                    seleccionada
                                                                        ? 'rgba(91, 155, 213, 0.20)'
                                                                        : '#ffffff',
                                                                color: '#1e3a5f',
                                                                fontWeight:
                                                                    seleccionada
                                                                        ? '700'
                                                                        : '500'
                                                            }}
                                                        >
                                                            {opcion.emoji}{' '}
                                                            {opcion.texto}
                                                            {cantidad > 0
                                                                ? ` ${cantidad}`
                                                                : ''}
                                                        </button>
                                                    )
                                                }
                                            )}
                                        </div>

                                        <div className="d-flex flex-wrap align-items-center gap-3">
                                            <span
                                                style={{
                                                    color: '#1e3a5f',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                {contarReacciones(
                                                    publicacion.id
                                                )}{' '}
                                                reacción
                                                {contarReacciones(
                                                    publicacion.id
                                                ) === 1
                                                    ? ''
                                                    : 'es'}
                                            </span>

                                            {reaccionDelUsuario && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0"
                                                    disabled={
                                                        estaGuardandoReaccion
                                                    }
                                                    onClick={() =>
                                                        quitarReaccion(
                                                            publicacion.id
                                                        )
                                                    }
                                                    style={{
                                                        color: '#d9534f',
                                                        textDecoration:
                                                            'none'
                                                    }}
                                                >
                                                    Quitar mi reacción
                                                </button>
                                            )}

                                            {estaGuardandoReaccion && (
                                                <small className="text-muted">
                                                    Guardando...
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
            </main>

            {imagenAbierta && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Imagen ampliada"
                    onClick={() => setImagenAbierta(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        background: 'rgba(6, 19, 33, 0.92)',
                        cursor: 'zoom-out'
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setImagenAbierta(null)}
                        aria-label="Cerrar imagen"
                        style={{
                            position: 'fixed',
                            top: '18px',
                            right: '22px',
                            zIndex: 10000,
                            width: '44px',
                            height: '44px',
                            border: '1px solid rgba(255, 255, 255, 0.45)',
                            borderRadius: '50%',
                            color: '#ffffff',
                            background: 'rgba(255, 255, 255, 0.12)',
                            fontSize: '1.8rem',
                            lineHeight: 1,
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>

                    <img
                        src={imagenAbierta.url}
                        alt={imagenAbierta.descripcion}
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            display: 'block',
                            maxWidth: '95vw',
                            maxHeight: '88vh',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: '12px',
                            boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
                            cursor: 'default'
                        }}
                    />
                </div>
            )}

            <footer
                className="navbar-gradient text-white text-center py-4 mt-auto"
                style={{ background: 'rgba(30, 58, 95, 0.97)' }}
            >
                <div className="container">
                    <img
                        src="/logo.png"
                        alt="Logo de la Institución Educativa Candelaria"
                        style={{
                            width: '58px',
                            height: '58px',
                            objectFit: 'contain',
                            marginBottom: '10px'
                        }}
                    />

                    <p
                        className="mb-1"
                        style={{
                            color: '#ffffff',
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: '700',
                            fontSize: '1rem'
                        }}
                    >
                        CONÉCTATE CANDELARIA
                    </p>

                    <p className="mb-1" style={{ color: '#ffffff', opacity: 0.9, fontSize: '0.9rem' }}>
                        Creado por <strong>Isabella Arenas López</strong>
                    </p>

                    <p className="mb-2" style={{ color: '#ffffff', opacity: 0.85, fontSize: '0.85rem' }}>
                        ¿Dudas, inquietudes o problemas con la plataforma?<br />
                        Contáctame: <a
                            href="mailto:isabellaarenasl@ielacandelariamedellin.edu.co"
                            style={{ color: '#a8d0e6', textDecoration: 'underline' }}
                        >
                            isabellaarenasl@ielacandelariamedellin.edu.co
                        </a>
                    </p>

                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <small style={{ color: '#ffffff', opacity: 0.7 }}>
                            Institución Educativa Candelaria · © 2026
                        </small>
                        <br />
                        <button
                            type="button"
                            className="btn btn-link btn-sm p-0 mt-1"
                            style={{ color: '#a8d0e6', fontSize: '0.8rem' }}
                            onClick={() => alert(
                                'Términos y Condiciones\n\n' +
                                '1. Esta plataforma es de uso exclusivo de la comunidad educativa de la Institución Educativa Candelaria.\n\n' +
                                '2. Los mensajes enviados por estudiantes son anónimos para los docentes.\n\n' +
                                '3. Está prohibido el uso de lenguaje ofensivo, amenazas o contenido inapropiado.\n\n' +
                                '4. Los datos se utilizan únicamente con fines académicos y de comunicación institucional.\n\n' +
                                '5. El mal uso de la plataforma puede generar sanciones según el manual de convivencia.\n\n' +
                                'Para más información contacta a: isabellaarenasl@ielacandelariamedellin.edu.co'
                            )}
                        >
                            Términos y Condiciones
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Inicio