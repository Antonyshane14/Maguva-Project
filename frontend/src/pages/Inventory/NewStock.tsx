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
type StockItem = {
  type: string;
  color: string;
  basePrice: string;
  markupPercent: string;
  sizes: Record<Size, string>;
};

const NewStock: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<StockItem[]>([createEmptyItem()]);
  const { showNotification } = useNotification();

  function createEmptyItem(): StockItem {
    return {
      type: '',
      color: '',
      basePrice: '',
      markupPercent: '',
      sizes: sizes.reduce((acc, size) => ({ ...acc, [size]: '' }), {} as Record<Size, string>),
    };
  }

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
  }, []);

  const handleItemChange = (index: number, field: keyof StockItem | Size, value: string) => {
    const updated = [...items];
    if (sizes.includes(field as Size)) {
      updated[index].sizes[field as Size] = value;
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
    }
  };

  const handleSubmit = async () => {
    

    const flattenedItems = items.flatMap(item => {
      return sizes
        .filter(size => item.sizes[size])
        .map(size => ({
          vendor: vendorId,
          type: item.type,
          color: item.color,
          size,
          quantity: parseInt(item.sizes[size]),
          basePrice: parseFloat(item.basePrice),
          priceMarkup: parseFloat(item.markupPercent),
        }));
    });

        const validItems = flattenedItems.filter(item => item.quantity > 0 && !isNaN(item.quantity));
    if (validItems.length === 0) {
    showNotification('Please enter valid quantity for at least one size', 'warning');
    return;
    }

    try {
      await api.post('/stock', { items: flattenedItems });
      showNotification('Stock added successfully', 'success');
      setItems([createEmptyItem()]);
    } catch {
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
          select
          fullWidth
          label="Select Vendor"
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
              <div style={{ gridColumn: '1 / -1' }}>
                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={item.type}
                  onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                >
                  {types.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Color"
                  type="color"
                  value={item.color}
                  onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Base Price (₹)"
                  type="number"
                  value={item.basePrice}
                  onChange={(e) => handleItemChange(index, 'basePrice', e.target.value)}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Markup (%)"
                  type="number"
                  value={item.markupPercent}
                  onChange={(e) => handleItemChange(index, 'markupPercent', e.target.value)}
                />
              </div>
              {sizes.map(size => (
                <div key={size}>
                  <TextField
                    label={`Qty ${size}`}
                    type="number"
                    value={item.sizes[size]}
                    onChange={(e) => handleItemChange(index, size, e.target.value)}
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