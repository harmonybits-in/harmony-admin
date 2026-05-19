// src/components/inventory/AreaMultiSelect.jsx
import { useState, useEffect, useRef } from 'react'

const AREAS = ['Home Delivery', 'Parcel', 'Dine In', 'Kitchen', 'Bar', 'Bakery', 'Cold Storage']

export default function AreaMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref     = useRef(null)
  const trigRef = useRef(null)
  const [dropPos, setDropPos] = useState({top:0,left:0,width:200})

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleOpen() {
    if (trigRef.current) {
      const rect = trigRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + window.scrollY + 3, left: rect.left + window.scrollX, width: rect.width })
    }
    setOpen(o => !o)
  }

  function toggle(area) {
    const has = selected.includes(area)
    onChange(has ? selected.filter(a => a !== area) : [...selected, area])
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* Trigger — chips + arrow */}
      <div ref={trigRef} onClick={handleOpen} style={{
        display:'flex', alignItems:'center', flexWrap:'wrap', gap:4,
        minHeight:38, padding:'4px 30px 4px 8px', borderRadius:6,
        border:`1px solid ${open ? '#e53e3e' : '#dde1e7'}`,
        background:'#fff', cursor:'pointer', position:'relative',
        transition:'border-color .15s',
      }}>
        {selected.length === 0 ? (
          <span style={{ fontSize:13, color:'#aaa' }}></span>
        ) : (
          selected.map(area => (
            <span key={area} style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'2px 8px', borderRadius:4,
              background:'#f5f5f5', border:'1px solid #e0e0e0',
              fontSize:12, color:'#333', fontWeight:500,
            }}>
              <span style={{ fontSize:11, color:'#888' }}>×</span>
              {area}
            </span>
          ))
        )}
        {/* Arrow */}
        <span style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          fontSize:11, color:'#aaa', pointerEvents:'none',
        }}>▼</span>
      </div>

      {/* Dropdown — checkbox list */}
      {open && (
        <div style={{
          position:'fixed', top:dropPos.top, left:dropPos.left, width:dropPos.width, zIndex:9999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)', overflow:'hidden', minWidth:180,
        }}>
          {AREAS.map(area => {
            const sel = selected.includes(area)
            return (
              <div key={area}
                onMouseDown={e => { e.preventDefault(); toggle(area) }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px', cursor:'pointer', fontSize:13,
                  background: sel ? '#fff5f5' : '#fff',
                  borderBottom:'1px solid #f8f8f8',
                  transition:'background .1s',
                }}
                onMouseEnter={e => { if(!sel) e.currentTarget.style.background='#fafafa' }}
                onMouseLeave={e => { if(!sel) e.currentTarget.style.background='#fff'   }}>
                {/* Checkbox */}
                <div style={{
                  width:18, height:18, borderRadius:4, flexShrink:0,
                  border:`2px solid ${sel ? '#e53e3e' : '#ccc'}`,
                  background: sel ? '#e53e3e' : '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .15s',
                }}>
                  {sel && <span style={{ color:'#fff', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ color: sel ? '#e53e3e' : '#333', fontWeight: sel ? 600 : 400 }}>
                  {area}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
