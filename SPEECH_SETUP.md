# Speech Integration for 3D Character

This project integrates text-to-speech and lipsync functionality for the 3D character.

## Setup

1. Create an `.env.local` file in the project root with your API keys:

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
SYNC_API_KEY=your_sync_api_key_here
```

2. Get API keys from:
   - ElevenLabs: https://elevenlabs.io/ (for text-to-speech)
   - Sync.so: https://sync.so/ (for lipsync)

## Features

- **Text-to-Speech**: Convert any text to natural-sounding speech using ElevenLabs
- **Lipsync**: Automatically animate the character's mouth based on the speech audio

## Implementation Details

The implementation includes:

1. **API Routes**:
   - `/api/tts` - Converts text to speech using ElevenLabs
   - `/api/lipsync` - Processes audio to generate lipsync data (currently mocked for testing)

2. **UI Components**:
   - Floating speech input to enter text
   - Speech playback with character animation

## Current Limitations

- The lipsync API integration is mocked with random data for testing
- The integration with the 3D model animation is not fully implemented yet
- Only supports English speech

## Next Steps

To complete the implementation:

1. Add your actual API keys to `.env.local`
2. Implement the full Sync.so API integration in `/api/lipsync`
3. Connect the lipsync data to the appropriate morph targets on the 3D model
4. Add error handling and loading states to the UI

## Usage

1. Click the microphone button (🎙️) in the bottom right of the screen
2. Enter text in the floating panel
3. Click "Play Speech" to hear and see the animation 