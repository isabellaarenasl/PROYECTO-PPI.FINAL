import { Link } from 'react-router-dom'

function Bienvenida() {
    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div className="login-card p-5 text-center" style={{ maxWidth: '500px', width: '90%' }}>
                <img src="/logo.png" alt="Conéctate Candelaria" className="login-logo mb-4" style={{ maxWidth: '150px' }} />

                <h1 className="mb-3" style={{ color: '#1e3a5f', fontSize: '2rem' }}>BIENVENIDO A CONÉCTATE CANDELARIA</h1>

                <p className="mb-5" style={{ fontSize: '1.1rem', color: '#666666' }}>
                    Plataforma de comunicación entre profesores y estudiantes
                </p>

                <div className="d-grid gap-3">
                    <Link to="/estudiantes" className="btn btn-primary btn-lg">
                        🎓 Soy estudiante
                    </Link>

                    <Link to="/acceso-profesores" className="btn btn-outline-primary btn-lg">
                        👨‍🏫 Soy profesor
                    </Link>
                </div>

                <p className="small mt-5 mb-0" style={{ color: '#999999' }}>
                    © 2026 Conéctate Candelaria - Todos los derechos reservados
                </p>
            </div>
        </div>
    )
}

export default Bienvenida