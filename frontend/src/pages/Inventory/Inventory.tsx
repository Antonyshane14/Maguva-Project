import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import api from '../../api';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface Product {
  _id: string;
  type: string;
  size: string;
  color: string;
  basePrice: number;
  markupPercent: number;
  inStock: number;
  vendor: {
    name: string;
  };
}

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const res = await api.get('/stock');
      setProducts(res.data);
    } catch {
      showNotification('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async () => {
  if (!selectedProduct || !restockAmount) return;
  try {
    await api.put(`/restock/${selectedProduct._id}`, {
      addedQuantity: Number(restockAmount)
    });
    showNotification('Stock updated', 'success');
    fetchProducts(); // refresh list
  } catch {
    showNotification('Failed to restock', 'error');
  } finally {
    setSelectedProduct(null);
    setRestockAmount('');
  }
};


  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Inventory
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate('/inventory/new-stock')}

        startIcon={<AddCircleOutline />}
      >
        Add New Stock
      </Button>

      <Paper sx={{ overflowX: 'auto' }}>
        {loading ? (
          <CircularProgress sx={{ m: 3 }} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Base Price</TableCell>
                <TableCell>Markup %</TableCell>
                <TableCell>In Stock</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Restock</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map(p => (
                <TableRow key={p._id}>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.size}</TableCell>
                  <TableCell>
                    <div style={{ background: p.color, width: 30, height: 30, borderRadius: 4 }} />
                  </TableCell>
                  <TableCell>₹{p.basePrice}</TableCell>
                  <TableCell>{p.markupPercent}%</TableCell>
                  <TableCell>{p.inStock}</TableCell>
                  <TableCell>{p.vendor?.name || '-'}</TableCell>
                  <TableCell>
                    <Button onClick={() => setSelectedProduct(p)} variant="outlined" size="small">
                      Restock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Restock Dialog */}
      <Dialog open={!!selectedProduct} onClose={() => setSelectedProduct(null)}>
        <DialogTitle>Restock: {selectedProduct?.type}</DialogTitle>
        <DialogContent>
          <TextField
            label="Add Quantity"
            fullWidth
            value={restockAmount}
            onChange={(e) => setRestockAmount(e.target.value)}
            type="number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedProduct(null)}>Cancel</Button>
          <Button onClick={handleRestock} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Inventory;
