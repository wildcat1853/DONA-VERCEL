import { useRoomContext, useStartAudio } from "@livekit/components-react";

// This component will be a child of LiveKitRoom, and it will handle the audio context
const AudioStarter: React.FC = () => {
  // Access the room context inside LiveKitRoom
  const room = useRoomContext();
  
  // Pass the room along with empty props to the hook
  const { canPlayAudio, mergedProps } = useStartAudio({ room, props: {} });

  return (
    <>
      {/* Show a button if audio cannot play automatically */}
      {!canPlayAudio && (
        <button {...mergedProps} className="p-2 bg-blue-500 text-white">
          Click to Enable Audio
        </button>
      )}
    </>
  );
};

export default AudioStarter;