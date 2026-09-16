import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const TIPOS_IMAGEN_PERMITIDOS = [
    'image/jpeg',
    'image/png',
    'image/webp'
]

const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024

function Publicaciones() {
    const [publicaciones, setPublicaciones] = useState([])
    const [contenido, setContenido] = useState('')
    const [imagenUrl, setImagenUrl] = useState('')
    const [archivoImagen, setArchivoImagen] = useState(null)
    const [vistaPrevia, setVistaPrevia] = useState('')
    const [publicacionEditando, setPublicacionEditando] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const [mensaje, setMensaje] = useState('')

    useEffect(() => {
        cargarPublicaciones()
    }, [])

    const cargarPublicaciones = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Debes iniciar sesión para ver tus publicaciones.')
            setCargando(false)
            return
        }

        const { data, error: errorPublicaciones } = await supabase
            .from('publicaciones')
            .select('*')
            .eq('autor_id', session.user.id)
            .order('created_at', { ascending: false })

        if (errorPublicaciones) {
            console.error(errorPublicaciones)
            setError(
                'No fue posible cargar las publicaciones. Verifica las tablas y políticas de Supabase.'
            )
        } else {
            setPublicaciones(data || [])
        }

        setCargando(false)
    }

    const limpiarFormulario = () => {
        setContenido('')
        setImagenUrl('')
        setArchivoImagen(null)
        setVistaPrevia('')
        setPublicacionEditando(null)
    }

    const handleSeleccionarImagen = (e) => {
        const archivo = e.target.files?.[0]

        if (!archivo) {
            return
        }

        setError('')
        setMensaje('')

        if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
            setError(
                'Formato no permitido. Usa una imagen JPG, PNG o WebP.'
            )
            e.target.value = ''
            return
        }

        if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
            setError('La imagen no puede superar los 5 MB.')
            e.target.value = ''
            return
        }

        setArchivoImagen(archivo)
        setImagenUrl('')
        setVistaPrevia(URL.createObjectURL(archivo))
    }

    const usarUrlImagen = (valor) => {
        setImagenUrl(valor)

        if (valor.trim()) {
            setArchivoImagen(null)
            setVistaPrevia(valor.trim())
        } else if (!archivoImagen) {
            setVistaPrevia('')
        }
    }

    const quitarImagenSeleccionada = () => {
        setArchivoImagen(null)
        setImagenUrl('')
        setVistaPrevia('')
    }

    const obtenerRutaStorage = (url) => {
        const marcador = '/storage/v1/object/public/publicaciones/'

        if (!url || !url.includes(marcador)) {
            return null
        }

        return decodeURIComponent(url.split(marcador)[1])
    }

    const subirImagenASupabase = async (session) => {
        if (!archivoImagen) {
            return imagenUrl.trim() || null
        }

        const extension =
            archivoImagen.name.split('.').pop()?.toLowerCase() || 'jpg'

        const nombreSeguro = archivoImagen.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .slice(0, 50)

        const rutaArchivo = `${session.user.id}/${Date.now()}-${nombreSeguro}.${extension}`

        const { error: errorSubida } = await supabase.storage
            .from('publicaciones')
            .upload(rutaArchivo, archivoImagen, {
                cacheControl: '3600',
                upsert: false,
                contentType: archivoImagen.type
            })

        if (errorSubida) {
            throw new Error(
                `No se pudo subir la imagen: ${errorSubida.message}`
            )
        }

        const { data: datosUrl } = supabase.storage
            .from('publicaciones')
            .getPublicUrl(rutaArchivo)

        return datosUrl.publicUrl
    }

    const eliminarImagenDeStorage = async (urlImagen) => {
        const ruta = obtenerRutaStorage(urlImagen)

        if (!ruta) {
            return
        }

        const { error: errorEliminarImagen } = await supabase.storage
            .from('publicaciones')
            .remove([ruta])

        if (errorEliminarImagen) {
            console.error(
                'No se pudo eliminar la imagen del Storage:',
                errorEliminarImagen
            )
        }
    }

    const handleGuardarPublicacion = async (e) => {
        e.preventDefault()

        setError('')
        setMensaje('')

        const contenidoLimpio = contenido.trim()

        if (!contenidoLimpio) {
            setError('Escribe el contenido de la publicación antes de guardarla.')
            return
        }

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            return
        }

        setGuardando(true)

        try {
            let imagenFinal = null

            if (archivoImagen) {
                imagenFinal = await subirImagenASupabase(session)
            } else {
                imagenFinal = imagenUrl.trim() || null
            }

            if (publicacionEditando) {
                const imagenAnterior = publicacionEditando.imagen_url

                const { error: errorActualizar } = await supabase
                    .from('publicaciones')
                    .update({
                        contenido: contenidoLimpio,
                        imagen_url: imagenFinal,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', publicacionEditando.id)
                    .eq('autor_id', session.user.id)

                if (errorActualizar) {
                    throw new Error(
                        `No se pudo actualizar la publicación: ${errorActualizar.message}`
                    )
                }

                if (
                    imagenAnterior &&
                    imagenAnterior !== imagenFinal &&
                    obtenerRutaStorage(imagenAnterior)
                ) {
                    await eliminarImagenDeStorage(imagenAnterior)
                }

                setMensaje('La publicación fue actualizada correctamente.')
            } else {
                const { error: errorInsertar } = await supabase
                    .from('publicaciones')
                    .insert({
                        autor_id: session.user.id,
                        contenido: contenidoLimpio,
                        imagen_url: imagenFinal
                    })

                if (errorInsertar) {
                    if (obtenerRutaStorage(imagenFinal)) {
                        await eliminarImagenDeStorage(imagenFinal)
                    }

                    throw new Error(
                        `No se pudo crear la publicación: ${errorInsertar.message}`
                    )
                }

                setMensaje('Tu publicación fue creada correctamente.')
            }

            limpiarFormulario()
            await cargarPublicaciones()
        } catch (errorGuardado) {
            console.error(errorGuardado)
            setError(errorGuardado.message)
        } finally {
            setGuardando(false)
        }
    }

    const prepararEdicion = (publicacion) => {
        setPublicacionEditando(publicacion)
        setContenido(publicacion.contenido || '')
        setImagenUrl(publicacion.imagen_url || '')
        setArchivoImagen(null)
        setVistaPrevia(publicacion.imagen_url || '')
        setMensaje('')
        setError('')

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    const eliminarPublicacion = async (publicacion) => {
        const confirmar = window.confirm(
            '¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.'
        )

        if (!confirmar) {
            return
        }

        setError('')
        setMensaje('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Inicia sesión nuevamente.')
            return
        }

        const { error: errorEliminar } = await supabase
            .from('publicaciones')
            .delete()
            .eq('id', publicacion.id)
            .eq('autor_id', session.user.id)

        if (errorEliminar) {
            console.error(errorEliminar)
            setError(
                `No se pudo eliminar la publicación: ${errorEliminar.message}`
            )
            return
        }

        if (obtenerRutaStorage(publicacion.imagen_url)) {
            await eliminarImagenDeStorage(publicacion.imagen_url)
        }

        if (publicacionEditando?.id === publicacion.id) {
            limpiarFormulario()
        }

        setMensaje('La publicación fue eliminada correctamente.')
        await cargarPublicaciones()
    }

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'long',
            timeStyle: 'short'
        }).format(new Date(fecha))
    }

    return (
        <div className="container py-4 pb-5">
            <div
                className="mb-4 p-4"
                style={{
                    background: 'rgba(30, 58, 95, 0.90)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 30px rgba(30, 58, 95, 0.25)'
                }}
            >
                <h1
                    style={{
                        color: '#ffffff',
                        fontSize: '2rem',
                        marginBottom: '0.5rem'
                    }}
                >
                    PUBLICACIONES
                </h1>

                <p
                    className="mb-0"
                    style={{
                        color: '#ffffff',
                        opacity: 0.9
                    }}
                >
                    Comparte avisos, actividades e información importante con los estudiantes.
                </p>
            </div>

            <div
                className="card mb-4"
                style={{
                    borderRadius: '20px',
                    border: 'none',
                    overflow: 'hidden'
                }}
            >
                <div className="card-body p-4">
                    <h4 className="mb-3">
                        {publicacionEditando
                            ? 'EDITAR PUBLICACIÓN'
                            : 'CREAR PUBLICACIÓN'}
                    </h4>

                    <form onSubmit={handleGuardarPublicacion}>
                        <div className="mb-3">
                            <label className="form-label">
                                Escribe tu publicación
                            </label>

                            <textarea
                                className="form-control"
                                rows="5"
                                placeholder="Ejemplo: Recuerden traer la guía de trabajo para la próxima clase..."
                                value={contenido}
                                onChange={(e) => setContenido(e.target.value)}
                                maxLength="2000"
                                required
                            />

                            <small className="text-muted">
                                {contenido.length}/2000 caracteres
                            </small>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Subir una imagen desde tu dispositivo
                                <span className="text-muted"> (opcional)</span>
                            </label>

                            <input
                                type="file"
                                className="form-control"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleSeleccionarImagen}
                            />

                            <small className="text-muted">
                                Formatos permitidos: JPG, PNG o WebP. Tamaño máximo: 5 MB.
                            </small>
                        </div>

                        <div className="text-center text-muted mb-3">
                            o
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Pegar URL de imagen
                                <span className="text-muted"> (opcional)</span>
                            </label>

                            <input
                                type="url"
                                className="form-control"
                                placeholder="https://ejemplo.com/imagen.jpg"
                                value={imagenUrl}
                                onChange={(e) => usarUrlImagen(e.target.value)}
                            />

                            <small className="text-muted">
                                Elige una opción: subir un archivo o pegar una URL.
                            </small>
                        </div>

                        {vistaPrevia && (
                            <div
                                className="mb-4 p-3"
                                style={{
                                    borderRadius: '15px',
                                    background: 'rgba(91, 155, 213, 0.12)'
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong style={{ color: '#1e3a5f' }}>
                                        Vista previa de la imagen
                                    </strong>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={quitarImagenSeleccionada}
                                    >
                                        Quitar imagen
                                    </button>
                                </div>

                                <img
                                    src={vistaPrevia}
                                    alt="Vista previa de la publicación"
                                    style={{
                                        width: '100%',
                                        maxHeight: '300px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(30, 58, 95, 0.15)'
                                    }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        )}

                        {mensaje && (
                            <div className="alert alert-success">
                                {mensaje}
                            </div>
                        )}

                        <div className="d-flex flex-wrap gap-2">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={guardando}
                            >
                                {guardando
                                    ? 'Guardando...'
                                    : publicacionEditando
                                        ? 'Guardar cambios'
                                        : 'Publicar ahora'}
                            </button>

                            {publicacionEditando && (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={limpiarFormulario}
                                    disabled={guardando}
                                >
                                    Cancelar edición
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">MIS PUBLICACIONES</h3>

                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={cargarPublicaciones}
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

                    <p className="mt-3">Cargando publicaciones...</p>
                </div>
            )}

            {!cargando && publicaciones.length === 0 && (
                <div
                    className="card text-center p-5"
                    style={{ borderRadius: '20px' }}
                >
                    <div style={{ fontSize: '3rem' }}>📢</div>

                    <h4 className="mt-3">AÚN NO HAY PUBLICACIONES</h4>

                    <p className="mb-0">
                        Escribe el primer aviso para que los estudiantes puedan verlo.
                    </p>
                </div>
            )}

            {!cargando &&
                publicaciones.map((publicacion) => (
                    <article
                        key={publicacion.id}
                        className="card mb-4 overflow-hidden"
                        style={{
                            borderRadius: '20px',
                            border: 'none'
                        }}
                    >
                        {publicacion.imagen_url && (
                            <img
                                src={publicacion.imagen_url}
                                alt="Imagen de la publicación"
                                style={{
                                    width: '100%',
                                    maxHeight: '420px',
                                    objectFit: 'cover'
                                }}
                            />
                        )}

                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                <div className="d-flex align-items-center">
                                    <div
                                        className="d-flex align-items-center justify-content-center"
                                        style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            marginRight: '12px',
                                            color: '#ffffff',
                                            background:
                                                'linear-gradient(135deg, #1e3a5f, #5b9bd5)',
                                            fontWeight: '700'
                                        }}
                                    >
                                        CC
                                    </div>

                                    <div>
                                        <strong
                                            style={{
                                                color: '#1e3a5f'
                                            }}
                                        >
                                            Mi publicación
                                        </strong>

                                        <br />

                                        <small className="text-muted">
                                            {formatearFecha(
                                                publicacion.created_at
                                            )}
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <p
                                className="mb-4"
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
                                className="d-flex flex-wrap gap-2 pt-3"
                                style={{
                                    borderTop:
                                        '1px solid rgba(30, 58, 95, 0.12)'
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() =>
                                        prepararEdicion(publicacion)
                                    }
                                >
                                    ✏️ Editar
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() =>
                                        eliminarPublicacion(publicacion)
                                    }
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
        </div>
    )
}

export default Publicaciones