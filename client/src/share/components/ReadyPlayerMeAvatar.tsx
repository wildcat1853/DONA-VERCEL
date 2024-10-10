'use client';

import React, { useState } from 'react';
import { Avatar } from '@readyplayerme/visage';

interface ReadyPlayerMeAvatarProps {
  avatarUrl: string;
  width?: string;
  height?: string;
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({ 
  avatarUrl, 
  width = '100%', 
  height = '100%'
}) => {
  const [feeling, setFeeling] = useState({});

  const happy = {
    mouthOpen: 0.2,
    mouthSmile: 0.2,
    eyeSquintLeft: 0.1,
    eyeSquintRight: 0.1,
    mouthSmileLeft: 0.6,
    mouthSmileRight: 0.6,
    browInnerUp: 0.2,
    browOuterUpLeft: 0.2,
    browOuterUpRight: 0.2,
    cheekPuff: 0.1,
    cheekSquintLeft: 0.1,
    cheekSquintRight: 0.1
  };

  const sad = {
    mouthOpen: 1,
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    eyeBlinkLeft: 0.2,
    eyeBlinkRight: 0.2,
    browInnerUp: -0.2,
    browDownLeft: 0.4,
    browDownRight: 0.4,
    mouthStretchLeft: -0.1,
    mouthStretchRight: -0.1,
    cheekPuff: 0.3,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3,
    noseSneerLeft: -0.1,
    noseSneerRight: -0.1
  };

  const feelings = [
    { label: "HAPPY", onClick: () => setFeeling(happy) },
    { label: "SAD", onClick: () => setFeeling(sad) },
    { label: "NEUTRAL", onClick: () => setFeeling({}) }
  ];

  return (
    <div style={{ width, height }}>
      <Avatar
        modelSrc={avatarUrl}
        onLoaded={() => console.log('Avatar loaded successfully')}
        scale={1}
        cameraTarget={1.4}
        cameraInitialDistance={0.8}
        emotion={feeling}
        idleRotation={false}
        headMovement={false}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <div>
        {feelings.map(({ label, onClick }) => (
          <button key={label} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReadyPlayerMeAvatar;
