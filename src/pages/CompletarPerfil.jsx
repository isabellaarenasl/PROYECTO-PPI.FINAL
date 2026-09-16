import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function CompletarPerfil() {
    const [nombre, setNombre] = useState('')
    const [materia, setMateria] = useState('')
    const [rol, setRol] = useState('')
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const verificarSesion = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                navigate('/acceso-profesores')
                return
            }

            // Verificar si ya completó el perfil
            const { data: perfil, error: perfilError } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (perfilError || !perfil || !perfil.primera_vez) {
                navigate('/acceso-profesores')
                return
            }

            setCargando(false)
        }

        verificarSesion()
    }, [navigate])

    const handleGuardarPerfil = async (e) => {
        e.preventDefault()
        setError('')

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            setError('No hay sesión activa')
            return
        }

        const { error } = await supabase
            .from('perfiles')
            .update({
                nombre,
                materia,
                rol,
                primera_vez: false
            })
            .eq('id', session.user.id)

        if (error) {
            setError('Error al guardar el perfil')
            return
        }

        navigate('/acceso-profesores')
    }

    if (cargando) {
        return (
            <div className="login-background d-flex justify-content-center align-items-center vh-100">
                <div className="text-white">
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-3">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div className="login-card p-4">
                <img src="/logo.png" alt="Conéctate Candelaria" className="login-logo mb-3" />
                <h3 className="text-center text-white mb-4">Completa tu perfil</h3>

                <p className="text-white small mb-4">
                    Es tu primera vez ingresando. Por favor completa tu información.
                </p>

                <form onSubmit={handleGuardarPerfil}>
                    <div className="mb-3">
                        <label className="text-white small">Nombre completo</label>
                        <input
                            type="text"
                            className="form-control"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Prof. Andrea Gómez"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="text-white small">Materia que dicta (o tu rol)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={materia}
                            onChange={(e) => setMateria(e.target.value)}
                            placeholder="Ej: Matemáticas"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="text-white small">Rol en la institución</label>
                        <select
                            className="form-select"
                            value={rol}
                            onChange={(e) => setRol(e.target.value)}
                            required
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="profesor">Profesor</option>
                            <option value="coordinador">Coordinador</option>
                            <option value="directivo">Directivo</option>
                            <option value="administrativo">Administrativo</option>
                            <option value="psicologia">Psicología</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    {error && <p className="text-danger small">{error}</p>}

                    <button type="submit" className="btn btn-light w-100 mb-3">
                        Guardar y continuar
                    </button>
                </form>
            </div>
        </div>
    )
}

export default CompletarPerfil