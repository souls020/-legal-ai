// App Component with Routing
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Import components
import {
  LoginPage,
  RegisterPage,
  HomePage,
  CreatePage,
  DocumentsPage,
  EditorPage,
  TemplatesPage,
  RegulationsPage,
  ProfilePage,
} from './pages';
import { MainLayout } from './layouts';
import { ProtectedRoute } from './components';
import { useAuthStore } from './stores';

const createLogger = (source: 'main' | 'renderer') => {
  const format = (level: string, message: string) =>
    `[${new Date().toISOString()}] [${level}] [${source.toUpperCase()}] ${message}`;

  return {
    debug: (message: string) => console.debug(format('DEBUG', message)),
    info: (message: string) => console.info(format('INFO', message)),
    warn: (message: string) => console.warn(format('WARN', message)),
    error: (message: string) => console.error(format('ERROR', message)),
  };
};

const logger = createLogger('renderer');

// Auth check wrapper
const AuthCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated]);

  return <>{children}</>;
};

function App(): JSX.Element {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    logger.info('App component mounted');

    // Check auth on app start
    if (!isAuthenticated) {
      checkAuth();
    }
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AuthCheck>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/documents/:id" element={<EditorPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/regulations" element={<RegulationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Redirect unknown routes to home or login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthCheck>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
