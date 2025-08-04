import React, { useState } from 'react';
import {
  Container, TextField, Button, Typography, Paper, CircularProgress, Alert, Box
} from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../api'; // ✅ updated to use the centralized axios instance
import { useNavigate } from 'react-router-dom';


const RegisterVendor: React.FC = () => {
    const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }
      };

      await api.post('/vendors', payload); // ✅ using api instance instead of hardcoded path
      showNotification('Vendor registered successfully', 'success');
      navigate('/vendors'); // Redirect to vendor list after successful registration
      
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Register New Vendor
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Vendor Name" name="name" required value={formData.name} onChange={handleChange} />
            <TextField label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
            <TextField label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
            <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
            <TextField label="Street" name="street" value={formData.street} onChange={handleChange} />
            <TextField label="City" name="city" value={formData.city} onChange={handleChange} />
            <TextField label="State" name="state" value={formData.state} onChange={handleChange} />
            <TextField label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} />
            <TextField label="Country" name="country" value={formData.country} onChange={handleChange} />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Register Vendor'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterVendor;
