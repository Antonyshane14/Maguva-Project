import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import api from '../../api';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: {
    productType: string;
    fabricType: string;
  };
  gst: {
    gstRate: number;
    taxCategory: string;
  };
  inStock?: number; // If your backend adds this later
  vendor?: {
    vendorName: string;
  };
}

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  

const [vendors, setVendors] = useState<{ _id: string; vendorName: string }[]>([]);

// Fetch vendors once
const fetchVendors = async () => {
  try {
    const res = await api.get('/vendor');
    setVendors(res.data);
  } catch {
    showNotification('Failed to load vendors', 'error');
  }
};

// Modify fetchProducts to attach resolved vendor
const fetchProducts = async () => {
  try {
    const res = await api.get('/stock');
    const enriched = res.data.map((p: any) => {
      const matchedVendor = vendors.find(v => v._id === p.vendor);
      return {
        ...p,
        vendorName: matchedVendor?.vendorName || '-',
        inStockDisplay:
          typeof p.inStock === 'number' && typeof p.initialStock === 'number'
            ? `${p.inStock}/${p.initialStock}`
            : '-',
      };
    });
    setProducts(enriched);
  } catch {
    showNotification('Failed to load inventory', 'error');
  } finally {
    setLoading(false);
  }
};

// Combine on mount
useEffect(() => {
  const init = async () => {
    await fetchVendors();
    await fetchProducts();
  };
  init();
}, []);


  
const handlePrintQRs = async (product: Product) => {
  const qrCount = product.inStock || 1;
  const qrText = product.sku || `SKU-${product._id}`;

  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < qrCount; i++) {
    const canvas = document.createElement('canvas');
    await new Promise<void>((resolve, reject) => {
  QRCode.toCanvas(canvas, qrText, { width: 150 }, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

    canvases.push(canvas);
  }

  // Create printable HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Print QR Codes</title>
        <style>
          body { padding: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
          canvas { width: 150px; height: 150px; }
        </style>
      </head>
      <body>
        ${canvases.map((canvas) => `<img src="${canvas.toDataURL()}" />`).join('')}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
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
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Fabric</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>GST %</TableCell>
                <TableCell>In Stock</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>QR Code</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category?.productType}</TableCell>
                  <TableCell>{p.category?.fabricType}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.gst?.gstRate || 0}%</TableCell>
                  

                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePrintQRs(p)}
                    >
                      Print QR
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
        <DialogTitle>Restock: {selectedProduct?.name}</DialogTitle>
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
          <Button onClick={handleRestock} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Inventory;
