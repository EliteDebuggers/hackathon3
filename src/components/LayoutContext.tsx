import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  isChatbotOpen: false,
  toggleChatbot: () => {},
});

export const useLayoutContext = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const toggleChatbot = () => setIsChatbotOpen(!isChatbotOpen);

  return (
    <LayoutContext.Provider value={{ isChatbotOpen, toggleChatbot }}>
      {children}
    </LayoutContext.Provider>
  );
};
