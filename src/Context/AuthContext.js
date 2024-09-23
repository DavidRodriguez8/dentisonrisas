import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Ajusta la ruta según tu estructura

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user);
            setLoading(false);
        };

        checkUserSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {!loading ? children : <p>Cargando...</p>}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);