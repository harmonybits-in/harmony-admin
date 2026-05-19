// src/components/inventory/PlaceholderPage.jsx

export default function PlaceholderPage({ title, icon }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#333', marginBottom:8 }}>{title}</h2>
      <p style={{ color:'#aaa', fontSize:13 }}>Yeh section coming soon hai.</p>
    </div>
  )
}
