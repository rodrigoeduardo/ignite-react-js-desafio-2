import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;     
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const {data: productInStock} = await api.get<Stock>(`/stock/${productId}`);

      const productExistsInCart = updatedCart.find(product => productId === product.id);
      const productAmountInCart = productExistsInCart ? productExistsInCart.amount : 0;

      if (productAmountInCart >= productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount++;

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        const {data: product} = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product,
          amount: 1
        }

        setCart([newProduct, ...updatedCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([newProduct, ...updatedCart]));
      }

    } catch(error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productExistsInCart = updatedCart.find(product => productId === product.id);

      if (!productExistsInCart) {
        throw new Error();
      }

      updatedCart.filter(product => productId !== product.id);

      setCart([...updatedCart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...updatedCart]));
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];

      const productExistsInCart = updatedCart.find(product => productId === product.id);
      const {data: productInStock} = await api.get<Stock>(`/stock/${productId}`);

      if ((productExistsInCart && productExistsInCart.amount <= 0) || amount <= 0) {
        return;
      }

      if (amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;

      } else if (productExistsInCart) {
        productExistsInCart.amount = amount;
        
        setCart([...updatedCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...updatedCart]));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
