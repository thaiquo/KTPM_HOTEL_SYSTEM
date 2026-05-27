import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { Room } from '../types';

export interface CartItem {
  id: string;
  room: Room;
  count: number;
}

interface CartContextType {
  cartItems: CartItem[];
  checkIn: string | null;
  checkOut: string | null;
  setDates: (checkIn: string, checkOut: string) => void;
  addToCart: (room: Room) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalRooms: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cartKey = `hotel_cart_v2_${user?.email || 'guest'}`;

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

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, cartKey]);

  const setDates = useCallback((inDate: string, outDate: string) => {
    setCheckInState(inDate);
    setCheckOutState(outDate);
    localStorage.setItem(`${cartKey}_checkIn`, inDate);
    localStorage.setItem(`${cartKey}_checkOut`, outDate);
  }, [cartKey]);

  const addToCart = useCallback((room: Room) => {
    setCartItems(prev => {
      // Instance-based cart: if room.id already exists, don't duplicate
      if (prev.some(item => item.room.id === room.id)) return prev;
      
      return [...prev, {
        id: room.id,
        room,
        count: 1
      }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCheckInState(null);
    setCheckOutState(null);
    localStorage.removeItem(`${cartKey}_checkIn`);
    localStorage.removeItem(`${cartKey}_checkOut`);
  }, [cartKey]);

  const totalRooms = useMemo(() => cartItems.length, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    checkIn,
    checkOut,
    setDates,
    addToCart,
    removeFromCart,
    clearCart,
    totalRooms
  }), [cartItems, checkIn, checkOut, setDates, addToCart, removeFromCart, clearCart, totalRooms]);

  return (
    <CartContext.Provider value={value}>
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
