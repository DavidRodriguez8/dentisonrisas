import {BrowserRouter, Routes, Route} from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import CitasComponent from './Components/CitasComponent';
import LoginComponent from './Components/LoginComponent';
import PrivateRoute from './Components/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<LoginComponent></LoginComponent>}> </Route>
          <Route path='/citas' element={<PrivateRoute element={<CitasComponent />} />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
