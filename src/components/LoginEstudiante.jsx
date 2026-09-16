import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function LoginEstudiante() {
    const [modoRegistro, setModoRegistro] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nombre, setNombre] = useState('')
    const [grado, setGrado] = useState('')
    const [error, setError] = useState('')
    const [mensaje, setMensaje] = useState('')

    const handleGoogleLogin = async () => {
        setError('')
        setMensaje('')

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo:
                    window.location.origin + '/verificar-estudiante'
            }
        })

        if (error) {
            console.error(error)
            setError(
                'No fue posible iniciar sesión con Google: ' + error.message
            )
        }
    }

    const handleEmailLogin = async (e) => {
        e.preventDefault()
        setError('')
        setMensaje('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Correo o contraseña incorrectos')
        }
    }

    const handleRegistro = async (e) => {
        e.preventDefault()
        setError('')
        setMensaje('')

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: nombre,
                    grado: grado,
                    rol: 'estudiante',
                },
            },
        })

        if (error) {
            setError(error.message)
        } else {
            setMensaje('Cuenta creada correctamente. Ya puedes iniciar sesión.')
            setModoRegistro(false)
        }
    }

    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div className="login-card p-4">
                <img src="/logo.png" alt="Conéctate Candelaria" className="login-logo mb-3" />
                <h3 className="text-center mb-4">ACCESO ESTUDIANTES</h3>

                <form onSubmit={modoRegistro ? handleRegistro : handleEmailLogin}>
                    {modoRegistro && (
                        <>
                            <div className="mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nombre completo"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Grado (ej: 9°A)"
                                    value={grado}
                                    onChange={(e) => setGrado(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="text-danger small">{error}</p>}
                    {mensaje && <p className="text-success small">{mensaje}</p>}

                    <button type="submit" className="btn btn-primary w-100 mb-3">
                        {modoRegistro ? 'Registrarse' : 'Iniciar sesión'}
                    </button>
                </form>

                <div className="text-center mb-3" style={{ color: '#666666' }}>o</div>

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="btn btn-outline-primary w-100 mb-3"
                >
                    Iniciar sesión con Google
                </button>

                <p className="text-center small mb-0">
                    {modoRegistro ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}{' '}
                    <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        style={{ color: '#1e3a5f' }}
                        onClick={() => {
                            setModoRegistro(!modoRegistro)
                            setError('')
                            setMensaje('')
                        }}
                    >
                        {modoRegistro ? 'Inicia sesión' : 'Regístrate'}
                    </button>
                </p>
            </div>
        </div>
    )
}

export default LoginEstudiante