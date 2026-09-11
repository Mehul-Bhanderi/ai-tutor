import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Workspace } from './pages/Workspace.jsx';
import { Login } from './pages/Login.jsx';

function Gate() {
  const { user, loading } = useAuth();

  if (loading) return <div className="splash">Loading…</div>;
  return user ? <Workspace /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
