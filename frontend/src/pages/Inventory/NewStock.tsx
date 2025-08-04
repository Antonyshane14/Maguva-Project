import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Button, MenuItem, TextField, IconButton
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import api from '../../api';
import { useNotification } from '../../contexts/NotificationContext';

const sizes = ['S', 'M', 'L', 'XL', 'XXL', 'None'] as const;
const types = ['Nighty', 'Saree', 'Chudidar', 'Kurti', 'Blouse'] as const;

type Size = typeof sizes[number];
type SizeData = { quantity: string; basePrice: string; markupPercent: string };

type StockItem = {
  type: string;
  color: string;
  sizes: Record<Size, SizeData>;
};

const createEmptyItem = (): StockItem => ({
  type: '',
  color: '',
  sizes: sizes.reduce((acc, size) => {
    acc[size] = { quantity: '', basePrice: '', markupPercent: '' };
    return acc;
  }, {} as Record<Size, SizeData>),
});

const NewStock: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<StockItem[]>([createEmptyItem()]);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get('/vendors');
        setVendors(res.data);
      } catch (err) {
        showNotification('Failed to load vendors', 'error');
      }
    };
    fetchVendors();
  }, [showNotification]);

  const handleAddItem = () => setItems([...items, createEmptyItem()]);

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

 const handleSubmit = async () => {
  const finalPayload = [];

  for (const item of items) {
    for (const size of sizes) {
      const { quantity, basePrice, markupPercent } = item.sizes[size];
      const q = parseInt(quantity);
      const bp = parseFloat(basePrice);
      const mp = parseFloat(markupPercent);

      if (!isNaN(q) && q > 0) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        const dateStr = `${dd}${mm}${yy}`;

        const vendorNick = (vendors.find(v => v._id === vendorId)?.nickname || 'VND').slice(0, 3).toUpperCase();
        const typeCode = item.type.slice(0, 2).toUpperCase();

        const statusList = Array.from({ length: q }, () => {
          const randomId = Math.floor(100000 + Math.random() * 900000);
          return {
            sku: `${vendorNick}-${typeCode}-${size}-${randomId}-${dateStr}`,
            inStock: true,
            soldDate: null
          };
        });

        finalPayload.push({
          vendor: vendorId,
          type: item.type,
          color: item.color,
          size,
          quantity: q,
          basePrice: bp,
          markupPercentage: mp,
          statusList
        });
      }
    }
  }

  if (finalPayload.length === 0) {
    showNotification('Please enter valid stock values', 'warning');
    return;
  }

  try {
    await api.post('/stock', { items: finalPayload });
    showNotification('Stock added successfully', 'success');
    setItems([createEmptyItem()]);
  } catch (err) {
    console.error('POST /stock error:', err);
    showNotification('Failed to add stock', 'error');
  }
};

  return (
    <Container sx={{ mt: 5 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Add New Stock
        </Typography>

        <TextField
          select fullWidth label="Select Vendor"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          sx={{ mb: 3 }}
        >
          {vendors.map((v) => (
            <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
          ))}
        </TextField>

        {items.map((item, index) => (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }} key={index}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <TextField
                select fullWidth label="Type"
                value={item.type}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].type = e.target.value;
                  setItems(updated);
                }}
              >
                {types.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth label="Color" type="color"
                value={item.color}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].color = e.target.value;
                  setItems(updated);
                }}
              />

              {sizes.map(size => (
                <div key={size} style={{ display: 'flex', gap: 8 }}>
                  <TextField
                    label={`Qty ${size}`}
                    type="number"
                    value={item.sizes[size].quantity}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].sizes[size].quantity = e.target.value;
                      setItems(updated);
                    }}
                    fullWidth
                  />
                  <TextField
                    label={`Base ₹${size}`}
                    type="number"
                    value={item.sizes[size].basePrice}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].sizes[size].basePrice = e.target.value;
                      setItems(updated);
                    }}
                    fullWidth
                  />
                  <TextField
                    label={`Markup %${size}`}
                    type="number"
                    value={item.sizes[size].markupPercent}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[index].sizes[size].markupPercent = e.target.value;
                      setItems(updated);
                    }}
                    fullWidth
                  />
                </div>
              ))}

              <div style={{ gridColumn: '1 / -1' }}>
                <IconButton color="error" onClick={() => handleRemoveItem(index)}>
                  <RemoveCircle />
                </IconButton>
              </div>
            </div>
          </Paper>
        ))}

        <Button onClick={handleAddItem} startIcon={<AddCircle />} sx={{ mb: 2 }}>
          Add Another Item
        </Button>

        <Button variant="contained" onClick={handleSubmit} disabled={!vendorId}>
          Submit All Stock
        </Button>
      </Paper>
    </Container>
  );
};

export default NewStock;
