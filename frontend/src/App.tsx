import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { RepoDetail } from './pages/RepoDetail';
import { Search } from './pages/Search';
import { Languages } from './pages/Languages';
import { Logs } from './pages/Logs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rankings" element={<Navigate to="/languages" replace />} />
              <Route path="/repo/:owner/:name" element={<RepoDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/languages" element={<Languages />} />
              <Route path="/logs" element={<Logs />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
