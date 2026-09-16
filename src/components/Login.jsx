import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [mensaje, setMensaje] = useState('')
    const navigate = useNavigate()

    const handleEmailLogin = async (e) => {
        e.preventDefault()
        setError('')
        setMensaje('')

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Correo o contraseña incorrectos')
            return
        }

        // Verificar si el perfil existe y si es la primera vez
        const { data: perfil, error: perfilError } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

        if (perfilError || !perfil) {
            setError('Error al cargar el perfil')
            return
        }

        // Si es la primera vez, redirigir a completar perfil
        if (perfil.primera_vez) {
            navigate('/completar-perfil', { state: { userId: data.user.id } })
        }
    }

    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div className="login-card p-4">
                <img src="/logo.png" alt="Conéctate Candelaria" className="login-logo mb-3" />
                <h3 className="text-center mb-4">ACCESO PROFESORES</h3>

                <form onSubmit={handleEmailLogin}>
                    <div className="mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Correo institucional"
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
                        Iniciar sesión
                    </button>
                </form>

                <p className="text-center small mt-3">
                    Solo personal autorizado puede ingresar
                </p>
            </div>
        </div>
    )
}

export default Login