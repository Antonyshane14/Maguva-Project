import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  People,
  Inventory,
  AttachMoney,
  Refresh,
  Star,
  ShoppingBag,
  Receipt,
  Timeline,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Demo data for presentation
const dashboardStats = {
  totalRevenue: 2875600,
  totalOrders: 1247,
  totalCustomers: 856,
  totalProducts: 432,
  lowStockProducts: 23,
  revenueGrowth: 24.5,
  ordersGrowth: 18.3,
  customersGrowth: 12.7,
  averageOrderValue: 2305,
};

const recentOrders = [
  { id: 'ORD-001', customer: 'Priya Sharma', amount: 4500, items: 2, status: 'completed', time: '2 hours ago' },
  { id: 'ORD-002', customer: 'Anjali Patel', amount: 12800, items: 4, status: 'processing', time: '3 hours ago' },
  { id: 'ORD-003', customer: 'Ritu Singh', amount: 6700, items: 1, status: 'completed', time: '5 hours ago' },
  { id: 'ORD-004', customer: 'Meera Gupta', amount: 8900, items: 3, status: 'pending', time: '6 hours ago' },
  { id: 'ORD-005', customer: 'Kavya Reddy', amount: 15600, items: 5, status: 'completed', time: '8 hours ago' },
];

const topCustomers = [
  { name: 'Priya Sharma', orders: 24, spent: 125000, loyalty: 'Gold' },
  { name: 'Anjali Patel', orders: 18, spent: 89500, loyalty: 'Silver' },
  { name: 'Ritu Singh', orders: 15, spent: 67800, loyalty: 'Silver' },
  { name: 'Meera Gupta', orders: 12, spent: 45600, loyalty: 'Bronze' },
];

const topProducts = [
  { name: 'Designer Kurti', sales: 1250000, growth: 15.2 },
  { name: 'Silk Sarees', sales: 950000, growth: 8.7 },
  { name: 'Western Dresses', sales: 780000, growth: 22.1 },
  { name: 'Lehenga Sets', sales: 650000, growth: 12.3 },
  { name: 'Casual Wear', sales: 420000, growth: -3.2 },
];

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, growth, color, subtitle }: any) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" component="h2" fontWeight="bold" color="text.primary">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
            {growth !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {growth > 0 ? (
                  <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} fontSize="small" />
                ) : (
                  <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={growth > 0 ? 'success.main' : 'error.main'}
                  fontWeight="bold"
                >
                  {Math.abs(growth)}%
                </Typography>
                <Typography variant="body2" color="textSecondary" ml={0.5}>
                  from last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              borderRadius: 3,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px rgba(0,0,0,0.15)`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name || 'Admin'}! 👋
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Here's what's happening with your boutique today
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => setIsLoading(true)}
          disabled={isLoading}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(dashboardStats.totalRevenue)}
            subtitle="This month"
            icon={<AttachMoney fontSize="large" />}
            growth={dashboardStats.revenueGrowth}
            color="primary"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Orders"
            value={dashboardStats.totalOrders}
            subtitle={`Avg: ${formatCurrency(dashboardStats.averageOrderValue)}`}
            icon={<ShoppingCart fontSize="large" />}
            growth={dashboardStats.ordersGrowth}
            color="success"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Customers"
            value={dashboardStats.totalCustomers}
            subtitle="Active customers"
            icon={<People fontSize="large" />}
            growth={dashboardStats.customersGrowth}
            color="info"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Products"
            value={dashboardStats.totalProducts}
            subtitle={`${dashboardStats.lowStockProducts} low stock`}
            icon={<Inventory fontSize="large" />}
            color="warning"
          />
        </Box>
      </Box>

      {/* Low Stock Alert */}
      {dashboardStats.lowStockProducts > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Inventory color="warning" />
                <Typography variant="h6" color="warning.dark">
                  ⚠️ {dashboardStats.lowStockProducts} products are running low on stock
                </Typography>
              </Box>
              <Button variant="contained" color="warning" size="small">
                View Inventory
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Charts and Recent Activity */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        {/* Recent Orders */}
        <Box flex="2" minWidth="400px">
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Receipt color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Recent Orders
              </Typography>
              <Chip label="Live" color="success" size="small" />
            </Box>
            <List>
              {recentOrders.map((order, index) => (
                <React.Fragment key={order.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <ShoppingBag />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight="bold">{order.customer}</Typography>
                          <Typography fontWeight="bold" color="primary">
                            {formatCurrency(order.amount)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                          <Typography variant="body2" color="textSecondary">
                            {order.id} • {order.items} items • {order.time}
                          </Typography>
                          <Chip
                            label={order.status}
                            size="small"
                            color={
                              order.status === 'completed' ? 'success' :
                              order.status === 'processing' ? 'warning' : 'default'
                            }
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentOrders.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Top Customers & Products */}
        <Box flex="1" minWidth="300px">
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Top Customers */}
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Star color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Top Customers
                </Typography>
              </Box>
              <List dense>
                {topCustomers.map((customer, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: customer.loyalty === 'Gold' ? '#FFD700' : 
                                customer.loyalty === 'Silver' ? '#C0C0C0' : '#CD7F32',
                        color: 'white'
                      }}>
                        {customer.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={customer.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {customer.orders} orders • {formatCurrency(customer.spent)}
                          </Typography>
                          <Chip label={customer.loyalty} size="small" variant="outlined" />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Product Performance */}
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Timeline color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Product Performance
                </Typography>
              </Box>
              {topProducts.slice(0, 4).map((product, index) => (
                <Box key={index} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {product.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {product.growth > 0 ? (
                        <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                      ) : (
                        <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                      )}
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(product.sales)}
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(product.sales / topProducts[0].sales) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* Quick Stats Summary */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          📊 Quick Insights
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box>
            <Typography variant="body2" color="textSecondary">Today's Sales</Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">₹85,400</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">Pending Orders</Typography>
            <Typography variant="h6" fontWeight="bold" color="warning.main">12</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">New Customers</Typography>
            <Typography variant="h6" fontWeight="bold" color="info.main">8</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">Best Selling Item</Typography>
            <Typography variant="h6" fontWeight="bold">Designer Kurti</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard;
