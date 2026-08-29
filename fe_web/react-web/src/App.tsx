import { RouterProvider } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { store } from '@/store';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AnimatePresence mode="wait">
          <RouterProvider router={router} />
        </AnimatePresence>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
