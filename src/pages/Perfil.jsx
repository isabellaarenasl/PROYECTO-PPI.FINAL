import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB

function Perfil() {
    const [perfil, setPerfil] = useState(null)
    const [nombre, setNombre] = useState('')
    const [materia, setMateria] = useState('')
    const [rol, setRol] = useState('')
    const [archivo, setArchivo] = useState(null)
    const [vistaPrevia, setVistaPrevia] = useState('')
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const [mensaje, setMensaje] = useState('')

    useEffect(() => {
        cargarPerfil()
    }, [])

    const cargarPerfil = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Vuelve a iniciar sesión.')
            setCargando(false)
            return
        }

        const { data, error: errorPerfil } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

        if (errorPerfil) {
            console.error(errorPerfil)
            setError('No se pudo cargar el perfil.')
            setCargando(false)
            return
        }

        if (!data) {
            setError('No se encontró tu perfil. Contacta al administrador.')
            setCargando(false)
            return
        }

        setPerfil(data)
        setNombre(data.nombre || '')
        setMateria(data.materia || '')
        setRol(data.rol || '')
        setVistaPrevia(data.foto_url || '')
        setCargando(false)
    }

    const handleSeleccionarFoto = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError('')
        setMensaje('')

        if (!TIPOS_IMAGEN.includes(file.type)) {
            setError('Solo se permiten imágenes JPG, PNG o WebP.')
            e.target.value = ''
            return
        }

        if (file.size > TAMANO_MAXIMO) {
            setError('La imagen no puede superar los 5 MB.')
            e.target.value = ''
            return
        }

        setArchivo(file)
        setVistaPrevia(URL.createObjectURL(file))
    }

    const quitarFoto = () => {
        setArchivo(null)
        setVistaPrevia(perfil?.foto_url || '')
    }

    const subirFoto = async (userId) => {
        if (!archivo) return perfil?.foto_url || null

        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
        const ruta = `${userId}/avatar-${Date.now()}.${extension}`

        // Si ya había una foto en el bucket, la borramos
        if (perfil?.foto_url?.includes('/avatars/')) {
            const rutaAnterior = perfil.foto_url.split('/avatars/')[1]
            if (rutaAnterior) {
                await supabase.storage.from('avatars').remove([rutaAnterior])
            }
        }

        const { error: errorSubida } = await supabase.storage
            .from('avatars')
            .upload(ruta, archivo, {
                cacheControl: '3600',
                upsert: true,
                contentType: archivo.type
            })

        if (errorSubida) {
            throw new Error(`Error al subir la foto: ${errorSubida.message}`)
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(ruta)
        return data.publicUrl
    }

    const handleGuardar = async (e) => {
        e.preventDefault()
        setError('')
        setMensaje('')

        const nombreLimpio = nombre.trim()
        if (!nombreLimpio) {
            setError('El nombre es obligatorio.')
            return
        }

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            setError('Tu sesión terminó. Vuelve a iniciar sesión.')
            return
        }

        setGuardando(true)

        try {
            const fotoFinal = await subirFoto(session.user.id)

            const { error: errorUpdate } = await supabase
                .from('perfiles')
                .update({
                    nombre: nombreLimpio,
                    materia: materia.trim() || null,
                    rol: rol.trim() || null,
                    foto_url: fotoFinal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id)

            if (errorUpdate) {
                throw new Error(errorUpdate.message)
            }

            setMensaje('Perfil actualizado correctamente.')
            setArchivo(null)
            await cargarPerfil()
        } catch (err) {
            console.error(err)
            setError(err.message || 'No se pudo guardar el perfil.')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border" style={{ color: '#1e3a5f' }} role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3">Cargando perfil...</p>
            </div>
        )
    }

    const fotoActual =
        vistaPrevia ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            nombre || 'Docente'
        )}&background=1e3a5f&color=fff&size=200`

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
                    MI PERFIL
                </h1>
                <p className="mb-0" style={{ color: '#ffffff', opacity: 0.92 }}>
                    Actualiza tu nombre, cargo y foto. La foto aparecerá en tus publicaciones y en el menú.
                </p>
            </div>

            <div className="card mx-auto" style={{ maxWidth: '640px', borderRadius: '20px' }}>
                <div className="card-body p-4">
                    {/* Foto */}
                    <div className="text-center mb-4">
                        <img
                            src={fotoActual}
                            alt="Foto de perfil"
                            style={{
                                width: '140px',
                                height: '140px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '4px solid rgba(91, 155, 213, 0.5)',
                                boxShadow: '0 8px 24px rgba(30, 58, 95, 0.25)'
                            }}
                        />
                        <div className="mt-3 d-flex justify-content-center gap-2 flex-wrap">
                            <label className="btn btn-outline-primary btn-sm mb-0">
                                Cambiar foto
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleSeleccionarFoto}
                                    hidden
                                />
                            </label>
                            {archivo && (
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={quitarFoto}>
                                    Cancelar cambio
                                </button>
                            )}
                        </div>
                        <small className="text-muted d-block mt-2">
                            JPG, PNG o WebP · Máximo 5 MB
                        </small>
                    </div>

                    <form onSubmit={handleGuardar}>
                        <div className="mb-3">
                            <label className="form-label">Nombre completo *</label>
                            <input
                                type="text"
                                className="form-control"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                maxLength={120}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Materia que dictas</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: Matemáticas, Ciencias, Español..."
                                value={materia}
                                onChange={(e) => setMateria(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Rol / Cargo institucional</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: Docente, Coordinador, Orientador..."
                                value={rol}
                                onChange={(e) => setRol(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        {error && <div className="alert alert-danger">{error}</div>}
                        {mensaje && <div className="alert alert-success">{mensaje}</div>}

                        <button type="submit" className="btn btn-primary w-100" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Perfil