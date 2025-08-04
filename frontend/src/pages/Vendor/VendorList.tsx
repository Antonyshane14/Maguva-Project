// src/pages/VendorList.tsx
import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableBody, TableRow,
  TableCell, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import api from '../../api'; // ✅ changed from axios to api
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface Vendor {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

const VendorList: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editedName, setEditedName] = useState('');
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors'); // ✅ use api instance
      setVendors(res.data);
    } catch (err) {
      showNotification('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/vendors/${id}`); // ✅ use api
      showNotification('Vendor deleted', 'success');
      setVendors(vendors.filter(v => v._id !== id));
    } catch {
      showNotification('Delete failed', 'error');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditedName(vendor.name);
  };

  const handleUpdate = async () => {
    if (!editingVendor) return;
    try {
      const res = await api.put(`/vendors/${editingVendor._id}`, { name: editedName }); // ✅ use api
      showNotification('Vendor updated', 'success');
      setVendors(vendors.map(v => v._id === editingVendor._id ? res.data.vendor : v));
      setEditingVendor(null);
    } catch {
      showNotification('Update failed', 'error');
    }
  };

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Vendor List
      </Typography>
      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate('/vendor-register')}
      >
        + Register New Vendor
      </Button>

      <Paper sx={{ overflowX: 'auto' }}>
        {loading ? (
          <CircularProgress sx={{ m: 3 }} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor._id}>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(vendor)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(vendor._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={!!editingVendor} onClose={() => setEditingVendor(null)}>
        <DialogTitle>Edit Vendor</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingVendor(null)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VendorList;
