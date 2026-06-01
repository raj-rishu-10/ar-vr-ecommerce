import { describe, it, expect, beforeEach } from 'vitest';
import { useARSceneStore } from '../useARSceneStore';

describe('useARSceneStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useARSceneStore.getState();
    store.placedItems = [];
    store.undoStack = [];
    store.redoStack = [];
    store.activeItemId = null;
    store.activeProduct = null;
  });

  const mockProduct = {
    id: 1,
    name: 'Test Chair',
    glbModel: '/models/chair.glb',
    modelScale: [1, 1, 1],
  };

  it('should set active product', () => {
    useARSceneStore.getState().setActiveProduct(mockProduct);
    expect(useARSceneStore.getState().activeProduct).toEqual(mockProduct);
  });

  it('should place an item in the scene', () => {
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    const items = useARSceneStore.getState().placedItems;
    
    expect(items.length).toBe(1);
    expect(items[0].product.name).toBe('Test Chair');
    expect(items[0].position).toEqual([0, 0, 0]);
  });

  it('should delete an item from the scene', () => {
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    let items = useARSceneStore.getState().placedItems;
    const itemId = items[0].id;
    
    expect(items.length).toBe(1);
    
    useARSceneStore.getState().deleteItem(itemId);
    items = useARSceneStore.getState().placedItems;
    
    expect(items.length).toBe(0);
  });

  it('should undo an action', () => {
    // Place an item
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    expect(useARSceneStore.getState().placedItems.length).toBe(1);
    
    // Undo
    useARSceneStore.getState().undo();
    expect(useARSceneStore.getState().placedItems.length).toBe(0);
  });

  it('should duplicate an item', () => {
    // Place an item
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    expect(useARSceneStore.getState().placedItems.length).toBe(1);
    
    const itemId = useARSceneStore.getState().placedItems[0].id;
    useARSceneStore.getState().duplicateItem(itemId);
    
    expect(useARSceneStore.getState().placedItems.length).toBe(2);
    expect(useARSceneStore.getState().placedItems[1].position).toEqual([0.2, 0, 0]);
  });

  it('should update item position', () => {
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    const itemId = useARSceneStore.getState().placedItems[0].id;
    
    useARSceneStore.getState().updateTransform(itemId, { position: [1, 2, 3] });
    
    const updatedItem = useARSceneStore.getState().placedItems[0];
    expect(updatedItem.position).toEqual([1, 2, 3]);
  });
  
  it('should activate an item on selection', () => {
    useARSceneStore.getState().placeItem(mockProduct, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    const itemId = useARSceneStore.getState().placedItems[0].id;
    
    useARSceneStore.getState().setActiveItemId(itemId);
    expect(useARSceneStore.getState().activeItemId).toBe(itemId);
  });
});
