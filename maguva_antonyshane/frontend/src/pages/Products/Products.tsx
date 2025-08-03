import React from 'react';
import { Typography, Container } from '@mui/material';

const Products: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Products
      </Typography>
      <Typography variant="body1">
        Manage your product catalog here.
      </Typography>
    </Container>
  );
};

export default Products;
