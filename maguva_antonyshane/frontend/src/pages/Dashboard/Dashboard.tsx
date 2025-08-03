import React from 'react';
import { Typography, Container } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Welcome to your boutique management dashboard!
      </Typography>
    </Container>
  );
};

export default Dashboard;
