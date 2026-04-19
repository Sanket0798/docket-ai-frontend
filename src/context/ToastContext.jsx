import { createContext, useContext, useState, useCallback } from 'react';
import { MdCheckCircle, MdError, MdWarning, MdInfo, MdClose } from 'react-icons/md';

const ToastContext = createContext(null);

const icons = {
  success: <MdCheckCircle size={18} className="text-green-500" />,
  error:   <MdError size={18} className="text-red-500" />,
  warning: <MdWarning size={18} className="text-yellow-500" />,
  info:    <MdInfo size={18} className="text-indigo-500" />,
};

const styles = {
  success: 'border-green-200 bg-green-50',
  error:   'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info:    'border-indigo-200 bg-indigo-50',
};

const textStyles = {
  success: 'text-green-800',
  error:   'text-red-800',
  warning: 'text-yellow-800',
  info:    'text-indigo-800',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-[360px] w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in
              ${styles[t.type] || styles.info}`}
          >
            <span className="flex-shrink-0 mt-0.5">{icons[t.type] || icons.info}</span>
            <p className={`text-sm font-medium flex-1 leading-snug ${textStyles[t.type] || textStyles.info}`}>
              {t.message}
            </p>
            <button onClick={() => remove(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5">
              <MdClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
