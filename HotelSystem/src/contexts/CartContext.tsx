import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  roomType: any;
  bedType: string;
  count: number;
  maxCount: number; // số phòng tối đa còn lại (từ DB)
}

interface CartContextType {
  cartItems: CartItem[];
  checkIn: string | null;
  checkOut: string | null;
  setDates: (checkIn: string, checkOut: string) => void;
  addToCart: (roomType: any, bedType: string, count: number, maxCount: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, count: number) => void;
  clearCart: () => void;
  totalRooms: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cartKey = `hotel_cart_${user?.email || 'guest'}`;

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(cartKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [checkIn, setCheckInState] = useState<string | null>(() => {
    return localStorage.getItem(`${cartKey}_checkIn`);
  });
  const [checkOut, setCheckOutState] = useState<string | null>(() => {
    return localStorage.getItem(`${cartKey}_checkOut`);
  });

  // Reload cart when user (and cartKey) changes
  useEffect(() => {
    const saved = localStorage.getItem(cartKey);
    setCartItems(saved ? JSON.parse(saved) : []);
    setCheckInState(localStorage.getItem(`${cartKey}_checkIn`));
    setCheckOutState(localStorage.getItem(`${cartKey}_checkOut`));
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, cartKey]);

  const setDates = (inDate: string, outDate: string) => {
    setCheckInState(inDate);
    setCheckOutState(outDate);
    localStorage.setItem(`${cartKey}_checkIn`, inDate);
    localStorage.setItem(`${cartKey}_checkOut`, outDate);
  };

  const addToCart = (roomType: any, bedType: string, count: number, maxCount: number) => {
    setCartItems(prev => {
      // Check if same roomType + bedType already exists in cart
      const existingIdx = prev.findIndex(item => item.roomType.id === roomType.id && item.bedType === bedType);
      
      if (existingIdx >= 0) {
        const newCart = [...prev];
        const merged = newCart[existingIdx].count + count;
        newCart[existingIdx] = {
          ...newCart[existingIdx],
          count: Math.min(merged, maxCount),
          maxCount,
        };
        return newCart;
      }
      
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        roomType,
        bedType,
        count,
        maxCount,
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, count: number) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, count } : item));
  };

  const clearCart = () => {
    setCartItems([]);
    setCheckInState(null);
    setCheckOutState(null);
    localStorage.removeItem(`${cartKey}_checkIn`);
    localStorage.removeItem(`${cartKey}_checkOut`);
  };

  const totalRooms = cartItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <CartContext.Provider value={{ cartItems, checkIn, checkOut, setDates, addToCart, removeFromCart, updateQuantity, clearCart, totalRooms }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
