import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient'; // Asegúrate de importar correctamente supabase.

const LoginComponent = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        Swal.fire({
            title: 'Iniciando sesión...',
            html: 'Por favor, espere un momento.',
            timer: 1000,
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError('Correo y/o Contraseña incorrectos');
        } else {
            navigate('/citas'); // Redirige a la ruta de citas
        }

        setLoading(false);
    };

    return (
        <div className="container text-center">
            <div className="row justify-content-md-center">
                <div className="col col-lg-2"></div>
                <div className="col-md-auto">
                    <br/><br/>
                    <div className="card">
                        <div className="d-flex justify-content-center">
                            <img src="/images/LOGO_DentiSonrisas.png" alt="profileImg" style={{ height: 'auto', width: '210px', marginTop: '30px' }} />
                        </div>
                        <div className="card-body">
                            <h3 className="card-title">Iniciar Sesión</h3>
                            <hr className="custom-hr" />
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                            <form onSubmit={handleLogin}>
                                {/* Email input */}
                                <div className="input-group mb-3">
                                    <span className="input-group-text" id="email-addon">
                                        <i className="fa-solid fa-at"></i>
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="form-control"
                                        placeholder="Correo electrónico"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Password input */}
                                <div className="input-group mb-3">
                                    <span className="input-group-text" id="password-addon">
                                        <i className="fa-solid fa-key"></i>
                                    </span>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        className="form-control"
                                        placeholder="Contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                    {loading ? 'Cargando...' : 'Iniciar Sesión'}
                                </button>
                                <br />
                                <div className="row justify-content-md-center mt-3">
                                    <a href="#!" style={{ marginRight: '8px' }}>¿Recuperar contraseña?</a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="col col-lg-2"></div>
            </div>
        </div>
    );
};

export default LoginComponent;