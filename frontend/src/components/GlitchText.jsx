import { useState, useRef, useEffect } from 'react';

const CHARS = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEF';

export default function GlitchText({ text, children, tag, as, className = '' }) {
  const Tag = tag || as || 'span';
  const rawText = text ?? (typeof children === 'string' ? children : '');
  const [displayText, setDisplayText] = useState(rawText);
  const intervalRef = useRef(null);

  useEffect(() => {
    setDisplayText(rawText);
  }, [rawText]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleMouseEnter = () => {
    if (!rawText) return;
    clearInterval(intervalRef.current);
    const start = Date.now();
    const duration = 300;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        clearInterval(intervalRef.current);
        setDisplayText(rawText);
      } else {
        const progress = elapsed / duration;
        const scrambled = rawText
          .split('')
          .map((ch, i) => {
            if (ch === ' ') return ' ';
            if (i / rawText.length < progress) return rawText[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('');
        setDisplayText(scrambled);
      }
    }, 40);
  };

  const handleMouseLeave = () => {
    clearInterval(intervalRef.current);
    setDisplayText(rawText);
  };

  return (
    <Tag
      className={`glitch glitch-text ${className}`}
      data-text={rawText}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayText || children}
    </Tag>
  );
}
