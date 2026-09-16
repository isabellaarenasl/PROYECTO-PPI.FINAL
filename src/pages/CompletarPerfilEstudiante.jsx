import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function CompletarPerfilEstudiante() {
    const [nombre, setNombre] = useState('')
    const [grado, setGrado] = useState('')
    const [correo, setCorreo] = useState('')
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        cargarDatosUsuario()
    }, [])

    const cargarDatosUsuario = async () => {
        setCargando(true)
        setError('')

        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            navigate('/estudiantes', { replace: true })
            return
        }

        setCorreo(session.user.email || '')

        const nombreGoogle =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.nombre ||
            ''

        const { data: perfil, error: errorPerfil } = await supabase
            .from('estudiantes')
            .select('id, email, nombre, grado, primera_vez')
            .eq('id', session.user.id)
            .maybeSingle()

        if (errorPerfil) {
            console.error(errorPerfil)
            setError(
                `No fue posible consultar tu perfil: ${errorPerfil.message}`
            )
            setCargando(false)
            return
        }

        if (perfil) {
            if (
                perfil.nombre &&
                perfil.nombre !== 'Usuario anónimo'
            ) {
                setNombre(perfil.nombre)
            } else if (nombreGoogle) {
                setNombre(nombreGoogle)
            }

            if (
                perfil.grado &&
                perfil.grado !== 'Sin especificar'
            ) {
                setGrado(perfil.grado)
            }
        } else if (nombreGoogle) {
            setNombre(nombreGoogle)
        }

        setCargando(false)
    }

    const guardarPerfil = async (e) => {
        e.preventDefault()

        setError('')

        const nombreLimpio = nombre.trim()
        const gradoLimpio = grado.trim()

        if (!nombreLimpio || !gradoLimpio) {
            setError('Completa tu nombre y tu grado para continuar.')
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

        const { data: perfilGuardado, error: errorGuardar } =
            await supabase
                .from('estudiantes')
                .upsert(
                    {
                        id: session.user.id,
                        email: session.user.email,
                        nombre: nombreLimpio,
                        grado: gradoLimpio,
                        primera_vez: false
                    },
                    {
                        onConflict: 'id'
                    }
                )
                .select()
                .single()

        if (errorGuardar) {
            console.error(errorGuardar)
            setError(
                `No fue posible guardar tu información: ${errorGuardar.message}`
            )
            setGuardando(false)
            return
        }

        if (!perfilGuardado) {
            setError('Supabase no devolvió el perfil guardado.')
            setGuardando(false)
            return
        }

        const { error: errorMetadata } = await supabase.auth.updateUser({
            data: {
                nombre: nombreLimpio,
                grado: gradoLimpio,
                rol: 'estudiante'
            }
        })

        if (errorMetadata) {
            console.warn(
                'El perfil se guardó, pero los metadatos no se actualizaron:',
                errorMetadata
            )
        }

        navigate('/estudiantes', { replace: true })
    }

    if (cargando) {
        return (
            <div className="login-background d-flex justify-content-center align-items-center vh-100">
                <div
                    className="text-center"
                    style={{ color: '#ffffff' }}
                >
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">
                            Cargando...
                        </span>
                    </div>

                    <p
                        className="mt-3"
                        style={{ color: '#ffffff' }}
                    >
                        Cargando tu perfil...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="login-background d-flex justify-content-center align-items-center min-vh-100 py-4">
            <div
                className="login-card p-4 p-md-5"
                style={{
                    maxWidth: '520px',
                    width: '92%'
                }}
            >
                <div className="text-center mb-4">
                    <img
                        src="/logo.png"
                        alt="Logo de Conéctate Candelaria"
                        className="login-logo mb-3"
                    />

                    <h2
                        style={{
                            color: '#1e3a5f',
                            fontSize: '1.7rem'
                        }}
                    >
                        COMPLETA TU PERFIL
                    </h2>

                    <p className="mb-2">
                        Diligencia tus datos para continuar como estudiante.
                    </p>

                    {correo && (
                        <small className="text-muted">
                            Cuenta: {correo}
                        </small>
                    )}
                </div>

                <form onSubmit={guardarPerfil}>
                    <div className="mb-3">
                        <label className="form-label">
                            Nombre completo
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Ejemplo: Santiago Rojas"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength="100"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">
                            Grado y grupo
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Ejemplo: 11-2"
                            value={grado}
                            onChange={(e) => setGrado(e.target.value)}
                            maxLength="50"
                            required
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={guardando}
                    >
                        {guardando
                            ? 'Guardando...'
                            : 'Guardar y continuar'}
                    </button>
                </form>

                <p
                    className="text-center small mt-4 mb-0"
                    style={{ color: '#6c757d' }}
                >
                    Tu nombre no será mostrado a los docentes cuando envíes mensajes anónimos.
                </p>
            </div>
        </div>
    )
}

export default CompletarPerfilEstudiante