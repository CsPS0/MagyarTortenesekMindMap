import React, { useMemo } from 'react';

interface TimelineViewProps {
  nodes: any[];
  isDarkMode: boolean;
  onNodeClick: (event: React.MouseEvent, node: any) => void;
  searchQuery: string;
}

export default function TimelineView({ nodes, isDarkMode, onNodeClick, searchQuery }: TimelineViewProps) {
  const sortedNodes = useMemo(() => {
    const withDate = nodes.filter(n => {
      const d = n.data?.date || n.date;
      if (!d || String(d).trim().length === 0) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const label = (n.data?.label || n.label || "").toLowerCase();
        const dateStr = String(d).toLowerCase();
        if (!label.includes(query) && !dateStr.includes(query)) return false;
      }
      
      return true;
    });

    return withDate.sort((a, b) => {
      const dateA = new Date((a.data?.date || a.date).replace(/\./g, '-')).getTime();
      const dateB = new Date((b.data?.date || b.date).replace(/\./g, '-')).getTime();
      return dateA - dateB;
    });
  }, [nodes]);

  return (
    <div 
      onWheel={(e) => {
        // Függőleges görgetés átalakítása vízszintessé
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
      style={{
        width: '100vw',
        height: '100vh',
        overflowX: 'auto',
        overflowY: 'hidden',
        background: 'var(--bg-color)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab',
        // Scrollbar elrejtése
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}
    >
      <style>{`
        /* Scrollbar elrejtése WebKit böngészőkben (Chrome, Safari, stb.) */
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 150px',
        minWidth: 'max-content',
        position: 'relative',
        height: '100%'
      }}>
        
        {/* Fő vízszintes vonal */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '4px',
          background: 'var(--text-color)',
          transform: 'translateY(-50%)',
          borderRadius: '4px',
          zIndex: 1
        }} />

        {sortedNodes.map((node, index) => {
          const isCardTop = index % 2 === 0;
          const nodeColor = '#3b82f6';
          const date = node.data?.date || node.date;

          return (
            <div key={node.id} style={{
              height: '500px', // Container height
              width: '320px', // Space for each node
              position: 'relative',
              flexShrink: 0
            }}>
              
              {/* Pont a fővonalon */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--bg-color)',
                border: `4px solid ${nodeColor}`,
                zIndex: 3,
                boxShadow: '0 0 0 3px var(--bg-color)'
              }} />

              {/* Átlós összekötő vonal */}
              <div style={{
                position: 'absolute',
                left: '50%',
                ...(isCardTop ? { bottom: '50%' } : { top: '50%' }),
                width: '4px',
                height: '80px',
                background: 'var(--text-color)',
                transformOrigin: isCardTop ? 'bottom center' : 'top center',
                transform: `translateX(-50%) rotate(${isCardTop ? '-45deg' : '45deg'})`,
                zIndex: 2,
                borderRadius: '2px'
              }} />

              {/* Kártya container */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 56px)', // X koordináta az átlós vonal végén
                ...(isCardTop ? { bottom: 'calc(50% + 56px)' } : { top: 'calc(50% + 56px)' }), // Y koordináta
                transform: 'translateX(-50%)', // Hogy a kártya közepe (vagy ahogy akarjuk) érjen a vonalhoz
                zIndex: 4,
                width: '280px'
              }}>
                <div 
                  onClick={(e) => onNodeClick(e, node)}
                  style={{
                    background: 'var(--node-bg)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '3px solid var(--text-color)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    width: '100%',
                    minHeight: '120px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = isCardTop ? 'translateY(-5px)' : 'translateY(5px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.25)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: nodeColor,
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {date}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--text-color)',
                    lineHeight: '1.4'
                  }}>
                    {node.data?.label || node.label}
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {sortedNodes.length === 0 && (
          <div style={{ position: 'absolute', left: '50vw', transform: 'translateX(-50%)', textAlign: 'center', color: 'var(--text-color)', opacity: 0.6 }}>
            Nincsenek idővonalon megjeleníthető események (hiányzó dátumok).
          </div>
        )}

      </div>
    </div>
  );
}
