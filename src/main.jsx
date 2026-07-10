import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,     // 2 minutes
      gcTime: 1000 * 60 * 10,       // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3000,
                className: 'toast-custom',
                style: {},
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
