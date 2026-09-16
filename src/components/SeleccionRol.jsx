function SeleccionRol({ onSeleccionar }) {
    return (
        <div className="login-background d-flex justify-content-center align-items-center vh-100">
            <div className="login-card p-4 text-center">
                <h3 className="text-white mb-4">Conéctate Candelaria</h3>
                <p className="text-white mb-4">¿Cómo vas a entrar?</p>

                <button
                    className="btn btn-light w-100 mb-3"
                    onClick={() => onSeleccionar('estudiante')}
                >
                    Soy estudiante
                </button>

                <button
                    className="btn btn-outline-light w-100"
                    onClick={() => onSeleccionar('profesor')}
                >
                    Soy profesor
                </button>
            </div>
        </div>
    )
}

export default SeleccionRol