import { Navigate } from 'react-router-dom';

// Legacy Auth page - redirect to client login
const Auth = () => {
  return <Navigate to="/login" replace />;
};

export default Auth;
