import { createContext, useContext } from 'react';

interface LayoutContextType {
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  isChatbotOpen: false,
  toggleChatbot: () => {},
});

export const useLayoutContext = () => useContext(LayoutContext);
