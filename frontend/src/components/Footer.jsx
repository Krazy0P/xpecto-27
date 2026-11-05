export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} XPECTO · IIT Mandi
      <div style={{ fontSize: '.72rem', opacity: .6, marginTop: '.3rem' }}>
        3D model “Need some space?” by <a href="https://sketchfab.com/norgeotloic" target="_blank" rel="noopener noreferrer">Loïc Norgeot</a> · <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
      </div>
    </footer>
  );
}
