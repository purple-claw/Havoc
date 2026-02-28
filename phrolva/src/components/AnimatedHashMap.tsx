// AnimatedHashMap — dictionary/hash map visualization with bucket animation
// Shows key-value pairs hashing into buckets with spring physics

import React, { useState, useEffect } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 300px;
`;

const BucketsContainer = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
`;

const Bucket = styled.div<{ $hasItems?: boolean }>`
  min-width: 100px;
  border: 2px solid ${({ $hasItems }) => ($hasItems ? '#667eea' : '#333')};
  border-radius: 8px;
  overflow: hidden;
  background: #0d0d1a;
`;

const BucketHeader = styled.div`
  padding: 0.4rem 0.6rem;
  background: #1a1a2e;
  font-size: 0.7rem;
  color: #888;
  text-align: center;
  border-bottom: 1px solid #333;
`;

const BucketItem = styled(animated.div)<{ $isNew?: boolean; $isHighlighted?: boolean }>`
  padding: 0.5rem 0.6rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  border-bottom: 1px solid #1a1a2e;
  background: ${({ $isHighlighted }) => ($isHighlighted ? 'rgba(102, 126, 234, 0.2)' : 'transparent')};
  
  &:last-child {
    border-bottom: none;
  }
`;

const Key = styled.span`
  color: #4facfe;
  font-weight: bold;
`;

const Value = styled.span`
  color: #43e97b;
`;

const EmptyBucket = styled.div`
  padding: 0.5rem;
  color: #444;
  font-size: 0.75rem;
  text-align: center;
  font-style: italic;
`;

const StatsBar = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: #888;
`;

const NUM_BUCKETS = 7;

// Simple hash function for visualization
function simpleHash(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % NUM_BUCKETS;
  }
  return Math.abs(hash);
}

interface HashEntry {
  key: string;
  value: any;
  bucket: number;
  isHighlighted: boolean;
  isNew: boolean;
}

interface AnimatedHashMapProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedHashMap: React.FC<AnimatedHashMapProps> = ({ commands, currentFrame, speed }) => {
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    const map = new Map<string, { value: any; bucket: number }>();
    let highlightedKey: string | null = null;
    let latestKey: string | null = null;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const key = String(cmd.target ?? '');
      const meta = cmd.metadata || {};

      if (
        cmdType === 'SET_VALUE' ||
        cmdType === 'CREATE' ||
        cmdType.includes('INSERT')
      ) {
        const k = key || String(cmd.value);
        const bucket = meta.bucket ?? simpleHash(k);
        map.set(k, { value: cmd.value, bucket: bucket % NUM_BUCKETS });
        highlightedKey = k;
        latestKey = k;
        setLastAction(`set("${k}", ${JSON.stringify(cmd.value)})`);
      } else if (cmdType === 'DELETE') {
        if (map.has(key)) {
          setLastAction(`delete("${key}")`);
          map.delete(key);
        }
      } else if (cmdType === 'HIGHLIGHT' || cmdType === 'VISIT') {
        highlightedKey = key;
      } else if (cmdType === 'UNMARK') {
        highlightedKey = null;
      }
    }

    const entryList: HashEntry[] = [];
    map.forEach(({ value, bucket }, key) => {
      entryList.push({
        key,
        value,
        bucket,
        isHighlighted: key === highlightedKey,
        isNew: key === latestKey,
      });
    });

    setEntries(entryList);
  }, [commands, currentFrame]);

  // Group entries by bucket
  const buckets: HashEntry[][] = Array.from({ length: NUM_BUCKETS }, () => []);
  entries.forEach((e) => {
    if (e.bucket < buckets.length) {
      buckets[e.bucket].push(e);
    }
  });

  return (
    <Container>
      <BucketsContainer>
        {buckets.map((bucket, bi) => (
          <Bucket key={bi} $hasItems={bucket.length > 0}>
            <BucketHeader>Bucket {bi}</BucketHeader>
            {bucket.length > 0 ? (
              bucket.map((entry) => (
                <BucketItem
                  key={entry.key}
                  $isHighlighted={entry.isHighlighted}
                  $isNew={entry.isNew}
                >
                  <Key>{entry.key}</Key>
                  <Value>{JSON.stringify(entry.value)}</Value>
                </BucketItem>
              ))
            ) : (
              <EmptyBucket>empty</EmptyBucket>
            )}
          </Bucket>
        ))}
      </BucketsContainer>

      <StatsBar>
        <span>{entries.length} entries</span>
        <span>{buckets.filter((b) => b.length > 0).length}/{NUM_BUCKETS} buckets used</span>
        <span>
          Load factor: {(entries.length / NUM_BUCKETS).toFixed(2)}
        </span>
      </StatsBar>

      {lastAction && (
        <div style={{ marginTop: '0.5rem', color: '#4facfe', fontSize: '0.85rem' }}>
          Last: {lastAction}
        </div>
      )}
    </Container>
  );
};

export default AnimatedHashMap;
