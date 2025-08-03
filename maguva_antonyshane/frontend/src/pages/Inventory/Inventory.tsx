import React from 'react';
import { Typography, Container } from '@mui/material';

const Inventory: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Inventory
      </Typography>
      <Typography variant="body1">
        Manage your inventory levels here.
      </Typography>
    </Container>
  );
};

export default Inventory;
