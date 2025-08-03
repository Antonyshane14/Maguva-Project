import React from 'react';
import { Typography, Container } from '@mui/material';

const POS: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Point of Sale
      </Typography>
      <Typography variant="body1">
        Process sales transactions here.
      </Typography>
    </Container>
  );
};

export default POS;
