import React from 'react';
import { Typography, Container } from '@mui/material';

const Reports: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Typography variant="body1">
        View analytics and reports here.
      </Typography>
    </Container>
  );
};

export default Reports;
