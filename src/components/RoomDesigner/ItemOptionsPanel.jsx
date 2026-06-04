import React, { useState, useMemo } from 'react';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import useCartStore from '../../store/cartStore';
import products from '../../data/products.json';
import { safeUUID } from '../../utils/uuid';

export default function ItemOptionsPanel({ item, onClose }) {
  const { removeFurniture, addFurniture, updateFurnitureTransform, setInteractionMode } = useFurnitureStore();
  const addItem = useCartStore(s => s.addItem);
  const [tab, setTab] = useState('swap'); // 'swap' | 'goeswith'
  const [imgIdx, setImgIdx] = useState(0);

  // Dynamic recommendations
  const recommendations = useMemo(() => {
    if (!item) return [];
    
    // For 'swap', find items in same category. For 'goeswith', find items in different categories
    const similar = products.filter(p => p.id !== item.id && p.category === item.category).slice(0, 3);
    const goesWith = products.filter(p => p.id !== item.id && p.category !== item.category).slice(0, 3);
    
    return tab === 'swap' ? similar : goesWith;
  }, [item, tab]);

  if (!item) return null;

  const priceRs = Math.round((item.price || 0) * 83);
  const images = [item.image, item.image, item.image]; // in real app would be multiple

  const handleAction = (recItem) => {
    if (tab === 'swap') {
      // Remove current item and add new one at same position
      removeFurniture(item.instanceId);
      const newItem = {
        ...recItem,
        instanceId: safeUUID(),
        position: [...item.position],
        rotation: [...item.rotation],
        scale: [...item.scale]
      };
      useFurnitureStore.setState(s => ({ 
        placedItems: [...s.placedItems, newItem],
        activeItemId: newItem.instanceId
      }));
    } else {
      // Just add to room near the current item
      const newItem = {
        ...recItem,
        instanceId: safeUUID(),
        position: [item.position[0] + 1, item.position[1], item.position[2] + 1],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      };
      useFurnitureStore.setState(s => ({ 
        placedItems: [...s.placedItems, newItem],
        activeItemId: newItem.instanceId
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', system-ui, sans-serif", overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#111', padding: 0, display: 'flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Item options</span>
      </div>

      {/* Wall-secured warning */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f5f5f0', fontSize: 12, color: '#555' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0058a3" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        This furniture must be secured to the wall.
      </div>

      {/* Product card */}
      <div style={{ padding: '16px', display: 'flex', gap: 12, borderBottom: '1px solid #e5e5e5' }}>
        {/* Image carousel */}
        <div style={{ position: 'relative', width: 100, flexShrink: 0 }}>
          <img src={images[imgIdx]} alt={item.name} style={{ width: 100, height: 100, objectFit: 'contain', background: '#f5f5f0', borderRadius: 4 }} />
          {imgIdx > 0 && (
            <button onClick={() => setImgIdx(i => i - 1)} style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, background: '#fff', border: '1px solid #ccc', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>‹</button>
          )}
          {imgIdx < images.length - 1 && (
            <button onClick={() => setImgIdx(i => i + 1)} style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, background: '#fff', border: '1px solid #ccc', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>›</button>
          )}
          {/* thumbnail dots */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} style={{ width: 28, height: 28, background: i === imgIdx ? '#0058a3' : '#e5e5e5', border: 'none', borderRadius: 2, cursor: 'pointer', padding: 2 }}>
                <img src={images[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: '#111' }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#767676', marginTop: 2, lineHeight: 1.4 }}>{item.description?.substring(0, 50)}</div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#767676', padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </button>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#111', marginTop: 8 }}>Rs.{priceRs.toLocaleString('en-IN')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{ color: '#e8a400', fontSize: 12 }}>{'★'.repeat(Math.round(item.rating || 4))}</span>
            <span style={{ fontSize: 11, color: '#0058a3', textDecoration: 'underline', cursor: 'pointer' }}>({item.reviews || 0})</span>
          </div>
          <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 12, color: '#0058a3', display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Show More Details
          </a>
        </div>
      </div>

      {/* Add to bag */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
        <button
          onClick={() => addItem(item)}
          style={{ width: '100%', padding: '12px', background: '#0058a3', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Add to bag
        </button>
      </div>

      {/* How to get it */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 10 }}>How to get it</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { icon: '🚚', label: 'Delivery', dot: '#f59e0b' },
            { icon: '📦', label: 'Collect at pick-up point', dot: '#f59e0b' },
            { icon: '🏪', label: 'Store', dot: null },
          ].map(o => (
            <div key={o.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: 18 }}>{o.icon}</span>
              <span style={{ lineHeight: 1.3 }}>{o.label}</span>
              {o.dot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: o.dot }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Swap / Goes well with tabs */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ display: 'flex' }}>
          {[{ id: 'swap', label: '↔ Swap with similar' }, { id: 'goeswith', label: 'Goes well with' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 8px', background: 'none',
                border: 'none', borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
                fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#111' : '#767676',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Similar products */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recommendations.length > 0 ? recommendations.map(p => (
            <div key={p.name} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, background: '#f5f5f0', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: '#111' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#767676', lineHeight: 1.4 }}>{p.description?.substring(0, 30)}...</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginTop: 2 }}>Rs.{Math.round(p.price * 83).toLocaleString('en-IN')}</div>
              </div>
              <button 
                onClick={() => handleAction(p)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', color: '#111' }}
              >
                {tab === 'swap' ? 'Swap' : 'Add'}
              </button>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: '#767676', textAlign: 'center', padding: '10px 0' }}>
              No recommendations found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
