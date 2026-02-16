import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import RepLayout from './components/layout/RepLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// Route guard
import ProtectedRoute from './routes/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminCustomers from './pages/admin/Customers';
import AdminCustomerDetail from './pages/admin/CustomerDetail';
import AdminReps from './pages/admin/Reps';
import AdminPayments from './pages/admin/Payments';
import AdminReports from './pages/admin/Reports';
import AdminSupport from './pages/admin/Support';
import AdminNotifications from './pages/admin/Notifications';
import AdminSettings from './pages/admin/Settings';

// Rep pages
import RepDashboard from './pages/rep/Dashboard';
import RepRoutes from './pages/rep/Routes';
import RepOrders from './pages/rep/Orders';
import RepPayments from './pages/rep/Payments';
import RepCustomers from './pages/rep/Customers';
import RepCustomerDetail from './pages/rep/CustomerDetail';
import RepPerformance from './pages/rep/Performance';

// Customer pages
import CustomerHome from './pages/customer/Home';
import CustomerProducts from './pages/customer/Products';
import CustomerCart from './pages/customer/Cart';
import CustomerCheckout from './pages/customer/Checkout';
import CustomerOrders from './pages/customer/Orders';
import CustomerLedger from './pages/customer/Ledger';
import CustomerOrderDetail from './pages/customer/OrderDetail';
import CustomerProfile from './pages/customer/Profile';
import CustomerNotifications from './pages/customer/Notifications';
import CustomerSupport from './pages/customer/Support';

// Error pages
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const routes: Record<string, string> = { Admin: '/admin', SalesRep: '/rep', Customer: '/shop' };
  return <Navigate to={routes[user?.role || ''] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, className: 'toast', style: { fontSize: '14px' } }} />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:id" element={<AdminCustomerDetail />} />
          <Route path="reps" element={<AdminReps />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Rep routes */}
        <Route path="/rep" element={<ProtectedRoute allowedRoles={['SalesRep']}><RepLayout /></ProtectedRoute>}>
          <Route index element={<RepDashboard />} />
          <Route path="payments" element={<RepPayments />} />
          <Route path="routes" element={<RepRoutes />} />
          <Route path="orders" element={<RepOrders />} />
          <Route path="customers" element={<RepCustomers />} />
          <Route path="customers/:id" element={<RepCustomerDetail />} />
          <Route path="performance" element={<RepPerformance />} />
        </Route>

        {/* Customer routes */}
        <Route path="/shop" element={<ProtectedRoute allowedRoles={['Customer']}><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<CustomerHome />} />
          <Route path="products" element={<CustomerProducts />} />
          <Route path="cart" element={<CustomerCart />} />
          <Route path="checkout" element={<CustomerCheckout />} />
          <Route path="orders" element={<CustomerOrders />}>
            <Route path=":id" element={<CustomerOrderDetail />} />
          </Route>
          <Route path="ledger" element={<CustomerLedger />} />
          <Route path="notifications" element={<CustomerNotifications />} />
          <Route path="support" element={<CustomerSupport />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
