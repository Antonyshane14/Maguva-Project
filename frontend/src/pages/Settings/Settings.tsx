import React from 'react';
import { Typography, Container } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1">
        Configure application settings here.
      </Typography>
    </Container>
  );
};

export default Settings;
