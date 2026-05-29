import { create } from 'zustand';
import products from '../data/products.json';

const categories = ['all', ...new Set(products.map((p) => p.category))];

const useProductStore = create((set, get) => ({
  products,
  categories,
  selectedCategory: 'all',
  searchQuery: '',

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredProducts: () => {
    const { products, selectedCategory, searchQuery } = get();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  },

  getProductById: (id) => {
    return get().products.find((p) => p.id === id);
  },
}));

export default useProductStore;
