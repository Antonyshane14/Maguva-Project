import React from 'react';
import { Typography, Container } from '@mui/material';

const ProductForm: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Product Form
      </Typography>
      <Typography variant="body1">
        Add or edit product details here.
      </Typography>
    </Container>
  );
};

export default ProductForm;
