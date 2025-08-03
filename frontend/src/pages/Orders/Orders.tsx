import React from 'react';
import { Typography, Container } from '@mui/material';

const Orders: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>
      <Typography variant="body1">
        View and manage orders here.
      </Typography>
    </Container>
  );
};

export default Orders;
