import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import ProductForm from './pages/Products/ProductForm';
import Customers from './pages/Customers/Customers';
import CustomerForm from './pages/Customers/CustomerForm';
import Orders from './pages/Orders/Orders';
import POS from './pages/POS/POS';
import Inventory from './pages/Inventory/Inventory';
import NewStock from './pages/Inventory/NewStock';

import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import VendorList from './pages/Vendor/VendorList';
import RegisterVendor from './pages/Vendor/RegisterVendor';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Vendor Management */}
                        <Route path="/vendors" element={<VendorList />} />
                        <Route path="/vendor-register" element={<RegisterVendor />} />
                        
                        {/* Product Management */}
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/new" element={<ProductForm />} />
                        <Route path="/products/:id/edit" element={<ProductForm />} />
                        
                        {/* Customer Management */}
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/new" element={<CustomerForm />} />
                        <Route path="/customers/:id/edit" element={<CustomerForm />} />
                        
                        {/* Order Management */}
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/pos" element={<POS />} />
                        
                        {/* Inventory */}
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/inventory/new-stock" element={<NewStock />} />
                        
                        {/* Reports */}
                        <Route path="/reports" element={<Reports />} />
                        
                        {/* Settings */}
                        <Route path="/settings" element={<Settings />} />
                        
                        {/* Catch all */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
