import React, { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0); // in Rupees
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notes, setNotes] = useState('');

  // Add or increment item
  const addItem = (product, quantity = 1) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(i => i.productId === product._id);
      if (existingIndex > -1) {
        const next = [...prevItems];
        next[existingIndex].quantity += quantity;
        return next;
      }

      return [
        ...prevItems,
        {
          productId: product._id,
          barcode: product.barcode,
          name: product.name,
          brand: product.brand || '',
          category: product.category || 'General',
          imageUrl: product.imageUrl || '',
          sellingPrice: product.sellingPrice, // in Paise
          mrp: product.mrp || product.sellingPrice,
          taxRate: product.taxRate || 0,
          stockQuantity: product.stockQuantity,
          unit: product.unit || 'pcs',
          quantity,
          discountAmount: 0 // in Rupees
        }
      ];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    const parsed = typeof newQuantity === 'string' ? parseFloat(newQuantity) : newQuantity;
    if (isNaN(parsed) || parsed <= 0) {
      removeItem(productId);
      return;
    }
    const cleanQty = Math.round(parsed * 1000) / 1000;
    setItems(prev => prev.map(item =>
      item.productId === productId ? { ...item, quantity: cleanQty } : item
    ));
  };

  const updateItemDiscount = (productId, discountInRupees) => {
    setItems(prev => prev.map(item =>
      item.productId === productId ? { ...item, discountAmount: Math.max(0, discountInRupees) } : item
    ));
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setBillDiscount(0);
    setSelectedCustomer(null);
    setNotes('');
  };

  // Authoritative calculations (computed in paise)
  const totals = useMemo(() => {
    let subtotalPaise = 0;
    let totalTaxPaise = 0;
    let totalItemsCount = 0;

    items.forEach(item => {
      const itemDiscountPaise = Math.round((item.discountAmount || 0) * 100);
      const baseLineTotal = Math.max(0, Math.round(item.sellingPrice * item.quantity) - itemDiscountPaise);
      let taxPaise = 0;
      if (item.taxRate > 0) {
        taxPaise = Math.round((baseLineTotal * item.taxRate) / 100);
      }

      subtotalPaise += baseLineTotal;
      totalTaxPaise += taxPaise;
      totalItemsCount += item.quantity;
    });

    const billDiscountPaise = Math.round((billDiscount || 0) * 100);
    const grandTotalPaise = Math.max(0, subtotalPaise + totalTaxPaise - billDiscountPaise);

    return {
      subtotalPaise,
      totalTaxPaise,
      billDiscountPaise,
      grandTotalPaise,
      totalItemsCount
    };
  }, [items, billDiscount]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        updateItemDiscount,
        removeItem,
        clearCart,
        billDiscount,
        setBillDiscount,
        selectedCustomer,
        setSelectedCustomer,
        notes,
        setNotes,
        totals
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
