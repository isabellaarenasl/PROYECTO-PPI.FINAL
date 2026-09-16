import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function VerificarEstudiante() {
    const [mensaje, setMensaje] = useState('Verificando tu cuenta...')
    const navigate = useNavigate()

    useEffect(() => {
        verificarPerfil()
    }, [])

    const verificarPerfil = async () => {
        const {
            data: { session }
        } = await supabase.auth.getSession()

        if (!session) {
            navigate('/estudiantes', { replace: true })
            return
        }

        const { data: perfil, error } = await supabase
            .from('estudiantes')
            .select('id, nombre, grado, primera_vez')
            .eq('id', session.user.id)
            .maybeSingle()

        if (error) {
            console.error('Error al verificar perfil:', error)
            setMensaje('No fue posible verificar tu perfil.')

            setTimeout(() => {
                navigate('/completar-perfil-estudiante', {
                    replace: true
                })
            }, 1200)

            return
        }

        const perfilCompleto =
            perfil &&
            perfil.nombre &&
            perfil.nombre !== 'Usuario anónimo' &&
            perfil.grado &&
            perfil.grado !== 'Sin especificar' &&
            perfil.primera_vez === false

        if (perfilCompleto) {
            navigate('/estudiantes', {
                replace: true
            })
            return
        }

        navigate('/completar-perfil-estudiante', {
            replace: true
        })
    }

    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div
                className="text-center p-4"
                style={{
                    color: '#ffffff'
                }}
            >
                <div
                    className="spinner-border text-light"
                    role="status"
                >
                    <span className="visually-hidden">
                        Cargando...
                    </span>
                </div>

                <p className="mt-3 mb-0">{mensaje}</p>
            </div>
        </div>
    )
}

export default VerificarEstudiante