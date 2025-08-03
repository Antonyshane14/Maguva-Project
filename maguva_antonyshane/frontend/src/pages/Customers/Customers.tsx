import React from 'react';
import { Typography, Container } from '@mui/material';

const Customers: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      <Typography variant="body1">
        Manage your customer database here.
      </Typography>
    </Container>
  );
};

export default Customers;
