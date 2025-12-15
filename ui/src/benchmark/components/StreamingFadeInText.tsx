import { useState, useEffect, useRef } from 'react';
import '@nvq/flowtoken/dist/styles.css';

interface StreamingFadeInTextProps {
  incomingText: string;
  animation?: string;
  animationDuration?: string;
  sep?: 'word' | 'char';
}

/**
 * Animated text component that fades in words/characters as they stream
 * Uses CSS animations for smooth performance
 */
export const StreamingFadeInText: React.FC<StreamingFadeInTextProps> = ({
  incomingText,
  animation = 'fadeIn',
  animationDuration = '0.5s',
  sep = 'word',
}) => {
  const [animatingTokens, setAnimatingTokens] = useState<{ token: string; id: number }[]>([]);
  const lastTokenTime = useRef<number>(performance.now());
  const numId = useRef<number>(0);
  const receivedText = useRef<string>('');

  useEffect(() => {
    if (incomingText && incomingText.length > receivedText.current.length) {
      const textToSplit = incomingText.slice(receivedText.current.length);

      let newTokens: string[] = [];
      if (sep === 'word') {
        newTokens = textToSplit.split(/(\s+)/).filter((token) => token.length > 0);
      } else if (sep === 'char') {
        newTokens = textToSplit.split('');
      }

      const newTokenObjects = newTokens.map((token) => ({ token, id: numId.current++ }));
      if (newTokenObjects.length === 0) return;

      newTokenObjects.forEach((tokenObj) => {
        const now = performance.now();
        const delay = Math.max(0, 10 - (now - lastTokenTime.current));
        lastTokenTime.current = now + delay;
        
        setTimeout(() => {
          setAnimatingTokens((prev) => [...prev, tokenObj]);
        }, delay);
      });

      receivedText.current = incomingText;
    }
  }, [incomingText, sep]);

  // Reset when content is cleared
  useEffect(() => {
    if (!incomingText || incomingText.length === 0) {
      setAnimatingTokens([]);
      receivedText.current = '';
      numId.current = 0;
      lastTokenTime.current = performance.now();
    }
  }, [incomingText]);

  return (
    <>
      {animatingTokens.map(({ token, id }) => {
        if (token === '\n') return <br key={id} />;

        return (
          <span
            key={id}
            className={animation}
            style={{
              animationDuration: animationDuration,
              animationTimingFunction: 'ease-in-out',
              animationFillMode: 'both',
              whiteSpace: 'pre-wrap',
              display: 'inline',
            }}
          >
            {token}
          </span>
        );
      })}
    </>
  );
};
