export default function GlitchText({ children, as: Tag = 'span', className = '' }) {
  return <Tag className={`glitch ${className}`} data-text={children}>{children}</Tag>;
}
