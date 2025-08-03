import React from 'react';
import { Typography, Container } from '@mui/material';

const CustomerForm: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Customer Form
      </Typography>
      <Typography variant="body1">
        Add or edit customer details here.
      </Typography>
    </Container>
  );
};

export default CustomerForm;
