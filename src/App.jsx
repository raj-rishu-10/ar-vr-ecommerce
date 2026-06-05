import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartSidebar from './components/cart/CartSidebar';
import LoadingSpinner from './components/ui/LoadingSpinner';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const ARViewer = lazy(() => import('./pages/ARViewer'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Confirmation = lazy(() => import('./pages/Confirmation'));
const ARRoomBuilder  = lazy(() => import('./pages/ARRoomBuilder'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AppContent() {
  const location = useLocation();
  const hideNavbar = ['/room-builder', '/ar'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <CartSidebar />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/ar" element={<ARViewer />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/room-builder" element={<ARRoomBuilder />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      <Routes>
        <Route path="/ar" element={null} />
        <Route path="/room-builder" element={null} />
        <Route path="*" element={<Footer />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
